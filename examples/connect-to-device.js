import {
  DjiDevice,
  djiDeviceBitrates,
  DjiDeviceImageStabilization,
  DjiDeviceModel,
  DjiDeviceResolution,
} from '../dist/index.js';

// if (process.argv.length < 6) {
//   console.error(
//     'Usage: node examples/connect-to-device.js <device-id> <device-model> <wi-fi-name> <wi-fi-password> <rtmp-url>',
//   );
//   // list support models
//   console.error('Supported models:', Object.values(DjiDeviceModel).join(', '));
//   process.exit(1);
// }


const deviceId = '...';//process.argv[2];
const deviceModel = DjiDeviceModel.osmoAction4; // process.argv[3];
const wiFiName = '...';//process.argv[4];
const wiFiPassword = '...';//process.argv[5];
const rtmpUrl = 'rtmp://192.168.0.129/live/stream';//process.argv[6];

console.log('Connecting to device:', deviceId, deviceModel);

const device = new DjiDevice(deviceId, deviceModel);
console.log('Connected to device:', device);
console.log('Starting live stream...');
await device.startLiveStream(
  wiFiName,
  wiFiPassword,
  rtmpUrl,
  DjiDeviceResolution.r1080p, // resolution
  30,
  djiDeviceBitrates[0], // bitrate
  DjiDeviceImageStabilization.RockSteadyPlus, // stabilization mode
);
