/* eslint-disable @typescript-eslint/no-unused-vars */
import { Peripheral, Characteristic, Service } from '@stoprocent/noble';
import noble from '@stoprocent/noble/with-custom-binding.js';
import {
  Model,
  BroadcastResolution,
  BroadcastEISMode,
  Status,
  BroadcastStatus,
} from './enums.js';
import {
  getAuthCommand,
  get_start_broadcast_command,
  get_stop_broadcast_command,
  getWiFiConfigurationCommand,
  getRTMPConfigCommand,
  parseNotifyMessage,
  Message,
  AuthEvent,
  BroadcastEvent,
  StatisticsMessage,
  WifiListEvent,
  UnknownEvent,
  getNextCountBits,
  get_initiate_broadcast_command,
  WiFiStatus,
} from './message.js';
import {
  getReadCharacteristicsUUID,
  getWriteCharacteristicsUUID,
} from './model.js';

const fff0Id = 'fff0';
// fff3 is write on OA5
const fff3Id = 'fff3';
// fff4 is read on all
const fff4Id = 'fff4';
// fff5 is write on others
const fff5Id = 'fff5';

enum DjiDeviceState {
  idle,
  discovering,
  connecting,
  authorizing,
  authorized,
  preparingStream,
  settingUpWifi,
  configuringRtmp,
  startingStream,
  streaming,
  stoppingStream,
}

const allowedCharacteristics = [fff0Id, fff3Id, fff4Id, fff5Id];

export class DjiDevice {
  private wifiSsid?: string;
  private wifiPassword?: string;
  private rtmpUrl?: string;
  private resolution?: BroadcastResolution = BroadcastResolution.fhd;
  private fps = 30;
  private bitrate = 6000000;
  private imageStabilization?: BroadcastEISMode = BroadcastEISMode.rockSteady;
  private deviceId?: string;
  private pairPinCode = '1234'; // Default PIN
  private noble?: typeof noble;
  private cameraPeripheral?: Peripheral;
  private writeCharacteristic?: Characteristic;
  private readCharacteristic?: Characteristic;
  private state: DjiDeviceState = DjiDeviceState.idle;
  private startStreamingTimer?: NodeJS.Timeout;
  private stopStreamingTimer?: NodeJS.Timeout;
  private model: Model;
  private onStreamingStateChange?: (
    device: DjiDevice,
    state: DjiDeviceState,
    message: Message,
  ) => void;
  private batteryPercentage?: number;
  private countBit = Buffer.from([0x00, 0x00]);

  constructor(deviceId: string, model: Model) {
    this.deviceId = deviceId;
    this.model = model;
  }

  async startLiveStream(
    wifiSsid: string,
    wifiPassword: string,
    rtmpUrl: string,
    resolution: BroadcastResolution,
    fps: number,
    bitrate: number,
    imageStabilization: BroadcastEISMode,
    onStreamingStateChange: (
      device: DjiDevice,
      state: DjiDeviceState,
      message: Message,
    ) => void,
  ): Promise<void> {
    console.info(
      `dji-device: Start live stream for ${Model[this.model]} with resolution ${resolution}, fps ${fps}, bitrate ${bitrate}, image stabilization ${imageStabilization}`,
    );
    this.wifiSsid = wifiSsid;
    this.wifiPassword = wifiPassword;
    this.rtmpUrl = rtmpUrl;
    this.resolution = resolution;
    this.fps = fps;
    this.bitrate = bitrate;
    this.imageStabilization = imageStabilization;
    this.onStreamingStateChange = onStreamingStateChange;
    this.reset();
    this.startStartStreamingTimer();
    this.setState(DjiDeviceState.discovering);
    this.noble = noble({ extended: true });
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
      this.noble.stop();
      this.noble.removeAllListeners();
      this.noble = undefined;
    }
    this.cameraPeripheral = undefined;
    this.writeCharacteristic = undefined;
    this.readCharacteristic = undefined;
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

  private setState(state: DjiDeviceState, message?: Message): void {
    if (this.state === state) {
      return;
    }
    console.info(
      `dji-device: State change ${DjiDeviceState[this.state]} -> ${DjiDeviceState[state]}`,
    );
    this.state = state;
    if (message) {
      this.onStreamingStateChange?.(this, state, message);
    }
  }

  public getState(): DjiDeviceState {
    return this.state;
  }

  public setPairPinCode(pinCode: string): void {
    this.pairPinCode = pinCode;
  }

  public getPairPinCode(): string | undefined {
    return this.pairPinCode;
  }

  public getBatteryPercentage(): number | undefined {
    return this.batteryPercentage;
  }

  private onStateChange(state: string): void {
    if (state === 'poweredOn') {
      console.log('Powered on');
      this.noble.reset();
      this.noble?.startScanningAsync([], false);
    }
  }

  private async onDiscover(peripheral: Peripheral): Promise<void> {
    let isError = false;
    if (peripheral.id !== this.deviceId) {
      return;
    }
    if (this.state !== DjiDeviceState.discovering) {
      return;
    }
    const manufacturerData = peripheral.advertisement.manufacturerData;
    if (!manufacturerData) {
      return;
    }
    this.noble?.stopScanning();
    this.cameraPeripheral = peripheral;

    if (peripheral.state !== 'connected') {
      console.info('dj-device: Try to connect asynchronously');
      await peripheral
        .connectAsync()
        .then(() => {
          console.info('dji-device: Connected');
        })
        .catch((error) => {
          if (error) {
            console.error('dji-device: Connection error', error);
            isError = true;
          }
        });
    } else {
      console.info('dji-device: Already connected');
    }

    if (isError) {
      return;
    }

    this.setState(DjiDeviceState.connecting);

    this.cameraPeripheral.discoverServices(
      [...allowedCharacteristics],
      this.onDiscoverServices.bind(this),
    );
  }

  private onDiscoverServices(error: Error | null, services: Service[]): void {
    if (error) {
      console.error('dji-device: Discover services error', error);
      this.reset();
      return;
    }
    services.forEach((service) => {
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
      console.error('dji-device: Discover characteristics error', error);
      this.reset();
      return;
    }

    const writeUUID = getWriteCharacteristicsUUID(this.model)
      .toString('hex')
      .toLowerCase();
    const readUUID = getReadCharacteristicsUUID(this.model)
      .toString('hex')
      .toLowerCase();

    characteristics.forEach((characteristic) => {
      if (characteristic.uuid.toLowerCase() === writeUUID) {
        this.writeCharacteristic = characteristic;
      }
      if (characteristic.uuid.toLowerCase() === readUUID) {
        this.readCharacteristic = characteristic;
      }
    });

    if (!this.writeCharacteristic || !this.readCharacteristic) {
      console.error('dji-device: Could not find characteristics');
      this.reset();
      return;
    }

    this.readCharacteristic.on('data', (data: Buffer) => {
      const message = parseNotifyMessage(data, this.model);
      this.onCharacteristicValueChanged(message);
    });
    this.readCharacteristic.subscribe();

    this.setState(DjiDeviceState.authorizing);
    this.sendAuth();
  }

  private onCharacteristicValueChanged(message: Message): void {
    console.log(
      `Received message in state ${DjiDeviceState[this.state]}`,
      message,
    );

    if ('status' in message) {
      const broadcastEvent = message as BroadcastEvent;
      if (broadcastEvent.status === BroadcastStatus.readyForWiFiCredentials) {
        this.setState(DjiDeviceState.settingUpWifi, message);
        this.sendWifiSetup();
      } else if (broadcastEvent.status === BroadcastStatus.live) {
        this.setState(DjiDeviceState.streaming, message);
      } else if (broadcastEvent.status === BroadcastStatus.preparing) {
        // we can ignore this for now
      }
    }

    if ('isAuthenticated' in message) {
      const authEvent = message as AuthEvent;
      if (authEvent.isAuthenticated) {
        this.setState(DjiDeviceState.authorized, message);
        this.sendInitiateBroadcast();
      } else {
        // Pin code is probably wrong, or user did not accept pairing
        this.reset();
      }
    }

    if ('wifiStatus' in message) {
      const wifiEvent = message as WifiListEvent;
      if (wifiEvent.wifiStatus === WiFiStatus.connected) {
        this.setState(DjiDeviceState.configuringRtmp, message);
        this.sendRtmpSetup();
      } else {
        // Wifi failed
        this.reset();
      }
    }

    if ('temperature' in message) {
      const stats = message as StatisticsMessage;
      this.batteryPercentage = stats.battery;
      this.onStreamingStateChange?.(this, this.state, message);
    }
  }

  private sendAuth() {
    console.info('dji-device: Sending auth');
    this.countBit = getNextCountBits(this.countBit);
    const message = getAuthCommand(this.pairPinCode, this.countBit);
    if (message) {
      this.writeValue(message);
    }
  }

  private sendInitiateBroadcast() {
    console.info('dji-device: Sending initiate broadcast');
    const message = get_initiate_broadcast_command();
    this.writeValue(message);
  }

  private sendWifiSetup() {
    console.info('dji-device: Sending wifi setup');
    if (!this.wifiSsid || !this.wifiPassword) {
      console.error('dji-device: wifi credentials not set');
      this.reset();
      return;
    }
    const message = getWiFiConfigurationCommand(
      this.wifiSsid,
      this.wifiPassword,
    );
    if (message) {
      this.writeValue(message);
    }
  }

  private sendRtmpSetup() {
    console.info('dji-device: Sending rtmp setup');
    if (!this.rtmpUrl || !this.resolution || !this.imageStabilization) {
      console.error('dji-device: rtmp config not set');
      this.reset();
      return;
    }
    this.countBit = getNextCountBits(this.countBit);
    const message = getRTMPConfigCommand(
      this.rtmpUrl,
      this.bitrate,
      this.resolution,
      this.fps,
      false, // auto
      this.imageStabilization,
      this.countBit,
    );
    if (message) {
      this.writeValue(message);
    }
  }

  private sendStopStream(): void {
    console.info('dji-device: Sending stop stream');
    const message = get_stop_broadcast_command();
    this.writeValue(message);
  }

  private async writeValue(value: Buffer): Promise<void> {
    if (!this.writeCharacteristic) {
      console.error('dji-device: Write characteristic not available');
      return;
    }
    try {
      await this.writeCharacteristic.writeAsync(value, true);
    } catch (error) {
      console.error('dji-device: Write error', error);
      this.reset();
    }
  }
}
