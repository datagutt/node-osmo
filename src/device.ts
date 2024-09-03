/* eslint-disable @typescript-eslint/no-unused-vars */
import noble, { Peripheral, Characteristic, Service } from '@abandonware/noble';

import { DjiDeviceModel, DjiDeviceModelName } from './enums.js';
import { DjiDeviceResolution, DjiDeviceImageStabilization } from './enums.js';
import {
  DjiPairMessagePayload,
  DjiMessage,
  DjiMessageWithData,
  DjiStopStreamingMessagePayload,
  DjiPreparingToLivestreamMessagePayload,
  DjiSetupWifiMessagePayload,
  DjiConfigureMessagePayload,
  DjiStartStreamingMessagePayload,
} from './message.js';

const pairTransactionId = 0x8092;
const stopStreamingTransactionId = 0xeac8;
const preparingToLivestreamTransactionId = 0x8c12;
const setupWifiTransactionId = 0x8c19;
const startStreamingTransactionId = 0x8c2c;
const configureTransactionId = 0x8c2d;

const pairTarget = 0x0702;
const stopStreamingTarget = 0x0802;
const preparingToLivestreamTarget = 0x0802;
const setupWifiTarget = 0x0702;
const configureTarget = 0x0102;
const startStreamingTarget = 0x0802;

const pairType = 0x450740;
const stopStreamingType = 0x8e0240;
const preparingToLivestreamType = 0xe10240;
const setupWifiType = 0x470740;
const configureType = 0x8e0240;
const startStreamingType = 0x780840;

const fff4Id = 'fff4';
const fff5Id = 'fff5';

enum DjiDeviceState {
  idle,
  discovering,
  connecting,
  checkingIfPaired,
  pairing,
  cleaningUp,
  preparingStream,
  settingUpWifi,
  configuring,
  startingStream,
  streaming,
  stoppingStream,
}

export class DjiDevice {
  private wifiSsid?: string;
  private wifiPassword?: string;
  private rtmpUrl?: string;
  private resolution?: DjiDeviceResolution = DjiDeviceResolution.r1080p;
  private fps: number = 30;
  private bitrate: number = 6000000;
  private imageStabilization?: DjiDeviceImageStabilization =
    DjiDeviceImageStabilization.RockSteadyPlus;
  private deviceId?: string;
  private pairPinCode?: string = 'love';
  private noble?: typeof noble;
  private cameraPeripheral?: Peripheral;
  private fff5Characteristic?: Characteristic;
  private state: DjiDeviceState = DjiDeviceState.idle;
  private startStreamingTimer?: NodeJS.Timeout;
  private stopStreamingTimer?: NodeJS.Timeout;
  private model?: DjiDeviceModel;
  private modelName?: DjiDeviceModelName;
  private onStreamingStateChange?: (
    device: DjiDevice,
    state: DjiDeviceState,
  ) => void;
  private batteryPercentage?: number;

  constructor(deviceId: string, model: DjiDeviceModel) {
    this.deviceId = deviceId;
    this.model = model;
    this.modelName = DjiDeviceModelName[model];
  }

  async startLiveStream(
    wifiSsid: string,
    wifiPassword: string,
    rtmpUrl: string,
    resolution: DjiDeviceResolution,
    fps: number,
    bitrate: number,
    imageStabilization: DjiDeviceImageStabilization,
  ): Promise<void> {
    console.info(
      `dji-device: Start live stream for ${this.modelName} with resolution ${resolution}, fps ${fps}, bitrate ${bitrate}, image stabilization ${imageStabilization}`,
    );
    this.wifiSsid = wifiSsid;
    this.wifiPassword = wifiPassword;
    this.rtmpUrl = rtmpUrl;
    this.resolution = resolution;
    this.fps = fps;
    this.bitrate = bitrate;
    this.imageStabilization = imageStabilization;
    this.reset();
    this.startStartStreamingTimer();
    this.setState(DjiDeviceState.discovering);
    this.noble = await import('@abandonware/noble').then(
      (module) => module.default,
    );
    this.noble.on('stateChange', this.onStateChange.bind(this));
    this.noble.on('discover', this.onDiscover.bind(this));
  }

  stopLiveStream(): void {
    if (this.state === DjiDeviceState.idle) {
      return;
    }
    console.info('dji-device: Stop live stream');
    this.stopStartStreamingTimer();
    this.startStopStreamingTimer();
    this.sendStopStream();
    this.setState(DjiDeviceState.stoppingStream);
  }

  private reset(): void {
    this.stopStartStreamingTimer();
    this.stopStopStreamingTimer();
    if (this.noble) {
      this.noble.removeAllListeners();
      this.noble = undefined;
    }
    this.cameraPeripheral = undefined;
    this.fff5Characteristic = undefined;
    this.batteryPercentage = undefined;
    this.setState(DjiDeviceState.idle);
  }

  private startStartStreamingTimer(): void {
    this.startStreamingTimer = setTimeout(
      this.startStreamingTimerExpired.bind(this),
      60000,
    );
  }

  private stopStartStreamingTimer(): void {
    if (this.startStreamingTimer) {
      clearTimeout(this.startStreamingTimer);
      this.startStreamingTimer = undefined;
    }
  }

  private startStreamingTimerExpired(): void {
    this.reset();
  }

  private startStopStreamingTimer(): void {
    this.stopStreamingTimer = setTimeout(
      this.stopStreamingTimerExpired.bind(this),
      10000,
    );
  }

  private stopStopStreamingTimer(): void {
    if (this.stopStreamingTimer) {
      clearTimeout(this.stopStreamingTimer);
      this.stopStreamingTimer = undefined;
    }
  }

  private stopStreamingTimerExpired(): void {
    this.reset();
  }

  private setState(state: DjiDeviceState): void {
    if (this.state === state) {
      return;
    }
    console.info(`dji-device: State change ${this.state} -> ${state}`);
    this.state = state;
    this.onStreamingStateChange?.(this, state);
  }

  public getState(): DjiDeviceState {
    return this.state;
  }

  public setPairPinCode(pinCode: string): void {
    this.pairPinCode = pinCode;
  }

  public getPairPinCode(): string {
    return this.pairPinCode;
  }

  public getBatteryPercentage(): number | undefined {
    return this.batteryPercentage;
  }

  private onStateChange(state: string): void {
    if (state === 'poweredOn') {
      this.noble?.startScanningAsync([], false);
    }
  }

  private onDiscover(peripheral: Peripheral): void {
    if (peripheral.id !== this.deviceId) {
      return;
    }
    const manufacturerData = peripheral.advertisement.manufacturerData;
    if (!manufacturerData) {
      return;
    }
    this.noble?.stopScanning();
    this.cameraPeripheral = peripheral;
    peripheral.connect((error) => {
      console.info('conn');
      if (error) {
        console.error('dji-device: Connection error', error);
        return;
      }
      console.info('dji-device: Connected');
      peripheral.discoverServices([], this.onDiscoverServices.bind(this));
    });
    this.startStartStreamingTimer();
    this.setState(DjiDeviceState.connecting);
  }

  private onDiscoverServices(error: Error | null, services: Service[]): void {
    if (error) {
      console.error('dji-device: Service discovery error', error);
      return;
    }
    services.forEach((service) => {
      console.info(`dji-device: Discovered service ${service.uuid}`);
      service.discoverCharacteristics(
        [],
        this.onDiscoverCharacteristics.bind(this),
      );
    });
  }

  private onDiscoverCharacteristics(
    error: Error | null,
    characteristics: Characteristic[],
  ): void {
    if (error) {
      console.error('dji-device: Characteristic discovery error', error);
      return;
    }
    characteristics.forEach((characteristic) => {
      console.info(
        `dji-device: Discovered characteristic ${characteristic.uuid}`,
      );
      if (characteristic.uuid === fff5Id) {
        this.fff5Characteristic = characteristic;
      }
      characteristic
        .subscribeAsync()
        .then(async () => {
          console.log('subscribed', characteristic.uuid);
          characteristic.on('data', (data) => {
            if (error) {
              console.error('dji-device: Characteristic read error', error);
              return;
            }
            console.info(
              `uffs ${data.toString('hex')} from characteristic ${characteristic.uuid}`,
              data,
            );
            this.onCharacteristicValueChanged(characteristic, data);
          });
          await characteristic.notifyAsync(true);
          await characteristic.readAsync();
        })
        .catch((error) => {
          if (error) {
            console.error('dji-device: Characteristic subscribe error', error);
          }
        });
    });
  }

  private onCharacteristicValueChanged(
    characteristic: Characteristic,
    value: Buffer,
  ): void {
    if (
      this.state === DjiDeviceState.connecting &&
      characteristic.uuid === fff4Id
    ) {
      console.info('dji-device: Attempting to pair');
      const payload = new DjiPairMessagePayload(this.pairPinCode);
      const request = new DjiMessage(
        pairTarget,
        pairTransactionId,
        pairType,
        payload.encode(),
      );
      this.writeMessage(request);
      this.setState(DjiDeviceState.checkingIfPaired);
      return;
    }

    if (!value?.length) {
      console.info('dji-device: Received empty message');
      return;
    }

    let message;
    try {
      message = new DjiMessageWithData(value);
      console.info(`dji-device: Received message ${message.format()}`);
    } catch (error) {
      console.error('dji-device: Error parsing message', error);
      return;
    }

    switch (this.state) {
      case DjiDeviceState.checkingIfPaired:
        this.processCheckingIfPaired(message);
        break;
      case DjiDeviceState.pairing:
        this.processPairing();
        break;
      case DjiDeviceState.cleaningUp:
        this.processCleaningUp(message);
        break;
      case DjiDeviceState.preparingStream:
        this.processPreparingStream(message);
        break;
      case DjiDeviceState.settingUpWifi:
        this.processSettingUpWifi(message);
        break;
      case DjiDeviceState.configuring:
        this.processConfiguring(message);
        break;
      case DjiDeviceState.startingStream:
        this.processStartingStream(message);
        break;
      case DjiDeviceState.streaming:
        this.processStreaming(message);
        break;
      case DjiDeviceState.stoppingStream:
        this.processStoppingStream(message);
        break;
      default:
        console.info(
          `dji-device: Received message in unexpected state '${this.state}'`,
        );
    }
  }

  private sendStopStream(): void {
    const payload = new DjiStopStreamingMessagePayload();
    this.writeMessage(
      new DjiMessage(
        stopStreamingTarget,
        stopStreamingTransactionId,
        stopStreamingType,
        payload.encode(),
      ),
    );
  }

  private processCheckingIfPaired(response: DjiMessage): void {
    if (response.id !== pairTransactionId) {
      return;
    }
    if (response.payload.equals(Buffer.from([0, 1]))) {
      this.processPairing();
    } else {
      this.setState(DjiDeviceState.pairing);
    }
  }

  private processPairing(): void {
    this.sendStopStream();
    this.setState(DjiDeviceState.cleaningUp);
  }

  private processCleaningUp(response: DjiMessage): void {
    if (response.id !== stopStreamingTransactionId) {
      return;
    }
    const payload = new DjiPreparingToLivestreamMessagePayload();
    this.writeMessage(
      new DjiMessage(
        preparingToLivestreamTarget,
        preparingToLivestreamTransactionId,
        preparingToLivestreamType,
        payload.encode(),
      ),
    );
    this.setState(DjiDeviceState.preparingStream);
  }

  private processPreparingStream(response: DjiMessage): void {
    if (
      response.id !== preparingToLivestreamTransactionId ||
      !this.wifiSsid ||
      !this.wifiPassword
    ) {
      return;
    }
    const payload = new DjiSetupWifiMessagePayload(
      this.wifiSsid,
      this.wifiPassword,
    );
    this.writeMessage(
      new DjiMessage(
        setupWifiTarget,
        setupWifiTransactionId,
        setupWifiType,
        payload.encode(),
      ),
    );
    this.setState(DjiDeviceState.settingUpWifi);
  }

  private processSettingUpWifi(response: DjiMessage): void {
    if (response.id !== setupWifiTransactionId || !this.model) {
      return;
    }
    switch (+this.model) {
      case DjiDeviceModel.osmoAction3:
      case DjiDeviceModel.osmoPocket3:
        this.sendStartStreaming();
        break;
      case DjiDeviceModel.osmoAction4: {
        const payload = new DjiConfigureMessagePayload(this.imageStabilization);
        this.writeMessage(
          new DjiMessage(
            configureTarget,
            configureTransactionId,
            configureType,
            payload.encode(),
          ),
        );
        this.setState(DjiDeviceState.configuring);
        break;
      }
      case DjiDeviceModel.unknown:
        this.sendStartStreaming();
        break;
    }
  }

  private processConfiguring(response: DjiMessage): void {
    if (response.id !== configureTransactionId) {
      return;
    }
    this.sendStartStreaming();
  }

  private sendStartStreaming(): void {
    if (!this.rtmpUrl || !this.resolution) {
      return;
    }
    const payload = new DjiStartStreamingMessagePayload(
      this.rtmpUrl,
      this.resolution,
      this.fps,
      this.bitrate / 1000,
    );
    this.writeMessage(
      new DjiMessage(
        startStreamingTarget,
        startStreamingTransactionId,
        startStreamingType,
        payload.encode(),
      ),
    );
    this.setState(DjiDeviceState.startingStream);
  }

  private processStartingStream(response: DjiMessage): void {
    if (response.id !== startStreamingTransactionId) {
      return;
    }
    this.setState(DjiDeviceState.streaming);
    this.stopStartStreamingTimer();
  }

  private processStreaming(response: DjiMessage): void {
    switch (response.type) {
      case 0x020d00:
        if (response.payload.length >= 21) {
          this.batteryPercentage = response.payload[20];
        }
        break;
      default:
        break;
    }
  }

  private processStoppingStream(response: DjiMessage): void {
    if (response.id !== stopStreamingTransactionId) {
      return;
    }
    this.reset();
  }

  private writeMessage(message: DjiMessage): void {
    this.writeValue(message.encode());
  }

  private writeValue(value: Buffer): void {
    if (!this.fff5Characteristic) {
      return;
    }
    this.fff5Characteristic.write(value, false);
  }
}
