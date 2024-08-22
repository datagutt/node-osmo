import {
  DjiDevice,
  djiDeviceBitrates,
  DjiDeviceImageStabilization,
  DjiDeviceModel,
  DjiDeviceResolution,
} from './dist/index.js';

/*
import { DjiDeviceScanner, DjiDiscoveredDevice } from './dist/index.js';
const { shared: scanner } = DjiDeviceScanner;
console.log('Starting DJI device scanner...');
scanner.startScanningForDevices();

scanner.on(
  'deviceDiscovered',
  async ({ peripheral, model, modelName }: DjiDiscoveredDevice) => {
    const device = new DjiDevice();
    console.log('Discovered device:', device, peripheral, model, modelName);
  },
);

scanner.stopScanningForDevices();
*/

const device = new DjiDevice('id-of-device', DjiDeviceModel.osmoAction4);
console.log('Discovered device:', peripheral);
await device.startLiveStream(
  'Wi-Fi-Name', // wi-fi name
  'Wi-Fi-Password', // wi-fi password
  'rtmp://1.3.3.7:1935/live/rtmp', // rtmp url
  DjiDeviceResolution.r1080p, // resolution
  30,
  djiDeviceBitrates[djiDeviceBitrates.length - 1], // bitrate
  DjiDeviceImageStabilization.RockSteadyPlus, // stabilization mode
);
