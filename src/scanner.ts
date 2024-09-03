import Noble, { Peripheral } from '@abandonware/noble';
import { EventEmitter } from 'events';
import {
  djiModelFromManufacturerData,
  djiModelNameFromManufacturerData,
  isDjiDevice,
} from './model.js';
import { DjiDeviceModel, DjiDeviceModelName } from './enums.js';

export class DjiDiscoveredDevice {
  peripheral: Peripheral;
  model: DjiDeviceModel;
  modelName: DjiDeviceModelName;
  constructor(
    peripheral: Peripheral,
    model: DjiDeviceModel,
    modelName: DjiDeviceModelName,
  ) {
    this.peripheral = peripheral;
    this.model = model;
    this.modelName = modelName;
  }
}

export class DjiDeviceScanner extends EventEmitter {
  static shared = new DjiDeviceScanner();
  discoveredDevices: DjiDiscoveredDevice[] = [];
  private noble?: typeof Noble;

  constructor() {
    super();
  }

  async startScanningForDevices(): Promise<void> {
    this.discoveredDevices = [];
    this.noble = await import('@abandonware/noble').then(
      (module) => module.default,
    );
    this.noble.on('stateChange', this.onStateChange.bind(this));
    this.noble.on('discover', this.onDiscover.bind(this));
  }

  stopScanningForDevices(): void {
    this.noble?.stopScanning();
    if (this.noble) {
      this.noble.removeAllListeners();
      this.noble = undefined;
    }
  }

  private onStateChange(state: string): void {
    if (state === 'poweredOn') {
      this.noble?.startScanningAsync([], false);
    }
  }

  private onDiscover(peripheral: Peripheral): void {
    const manufacturerData = peripheral.advertisement.manufacturerData;
    if (!manufacturerData) {
      return;
    }
    if (!isDjiDevice(manufacturerData)) {
      return;
    }
    if (
      this.discoveredDevices.some(
        (device) => device?.peripheral?.id === peripheral.id,
      )
    ) {
      return;
    }
    const model = djiModelFromManufacturerData(manufacturerData);
    const modelName = djiModelNameFromManufacturerData(manufacturerData);
    console.info(`dji-scanner: Manufacturer data ${manufacturerData.toString('hex')} for peripheral id ${peripheral.id}
    and model ${modelName}`);
    const device = new DjiDiscoveredDevice(peripheral, model, modelName);
    this.discoveredDevices.push(device);
    this.emit('deviceDiscovered', device);
  }
}
