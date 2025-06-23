import { Peripheral } from '@stoprocent/noble';
import noble from '@stoprocent/noble/with-custom-binding.js';

import { EventEmitter } from 'events';
import { getModelFromManufacturerData } from './model.js';
import { Model } from './enums.js';

export class DjiDiscoveredDevice {
  peripheral: Peripheral;
  model: Model;

  constructor(peripheral: Peripheral, model: Model) {
    this.peripheral = peripheral;
    this.model = model;
  }
}

export class DjiDeviceScanner extends EventEmitter {
  static shared = new DjiDeviceScanner();
  discoveredDevices: DjiDiscoveredDevice[] = [];
  private noble?: typeof noble;

  constructor() {
    super();
  }

  async startScanningForDevices(): Promise<void> {
    this.discoveredDevices = [];
    this.noble = noble({ extended: true });
    this.noble.on('stateChange', this.onStateChange.bind(this));
    this.noble.on('discover', this.onDiscover.bind(this));
  }

  stopScanningForDevices(): void {
    this.noble?.stopScanning();
    if (this.noble) {
      this.noble.stop();
      this.noble.removeAllListeners();
      this.noble = undefined;
    }
  }

  private onStateChange(state: string): void {
    if (state === 'poweredOn') {
      console.log('Powered on');
      this.noble.reset();
      this.noble?.startScanningAsync([], true); // allow duplicates
    }
  }

  private onDiscover(peripheral: Peripheral): void {
    const manufacturerData = peripheral.advertisement.manufacturerData;
    if (!manufacturerData) {
      return;
    }
    const model = getModelFromManufacturerData(manufacturerData);
    if (model === null) {
      return;
    }
    if (
      this.discoveredDevices.some(
        (device) => device?.peripheral?.id === peripheral.id,
      )
    ) {
      return;
    }
    console.info(`dji-scanner: Manufacturer data ${manufacturerData.toString(
      'hex',
    )} for peripheral id ${peripheral.id}
    and model ${Model[model]}`);
    const device = new DjiDiscoveredDevice(peripheral, model);
    this.discoveredDevices.push(device);
    this.emit('deviceDiscovered', device);
  }
}
