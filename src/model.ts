import { DjiDeviceModel, DjiDeviceModelName } from './enums.js';

const djiTechnologyCoLtd = Buffer.from([0xaa, 0x08]);
const djiTechnologyCoLtd_old = Buffer.from([0xc0, 0xe5]);
const djiDeviceModelOsmoAction1 = Buffer.from([0x82, 0x00]);
const djiDeviceModelOsmoAction3 = Buffer.from([0x12, 0x00]);
const djiDeviceModelOsmoAction4 = Buffer.from([0x14, 0x00]);
const djiDeviceModelOsmoAction5Pro = Buffer.from([0x15, 0x00]);
const djiDeviceModelOsmoPocket3 = Buffer.from([0x20, 0x00]);

export function djiModelFromManufacturerData(
  data: Buffer,
): DjiDeviceModel | null {
  if (data.length < 4) {
    return null;
  }
  const modelData = data.subarray(2, 4);
  if (modelData.equals(djiDeviceModelOsmoAction1)) {
    return DjiDeviceModel.osmoAction1;
  } else if (modelData.equals(djiDeviceModelOsmoAction3)) {
    return DjiDeviceModel.osmoAction3;    
  } else if (modelData.equals(djiDeviceModelOsmoAction4)) {
    return DjiDeviceModel.osmoAction4;
  } else if (modelData.equals(djiDeviceModelOsmoAction5Pro)) {
    return DjiDeviceModel.osmoAction5Pro;
  } else if (modelData.equals(djiDeviceModelOsmoPocket3)) {
    return DjiDeviceModel.osmoPocket3;
  } else {
    return DjiDeviceModel.unknown;
  }
}
export function djiModelNameFromManufacturerData(
  data: Buffer,
): DjiDeviceModelName | null {
  if (data.length < 4) {
    return null;
  }
  const modelData = data.subarray(2, 4);
  if (modelData.equals(djiDeviceModelOsmoAction1)) {
    return DjiDeviceModelName.osmoAction1;
  } else if (modelData.equals(djiDeviceModelOsmoAction3)) {
    return DjiDeviceModelName.osmoAction3;
  } else if (modelData.equals(djiDeviceModelOsmoAction4)) {
    return DjiDeviceModelName.osmoAction4;
  } else if (modelData.equals(djiDeviceModelOsmoAction5Pro)) {
    return DjiDeviceModelName.osmoAction5Pro;
  } else if (modelData.equals(djiDeviceModelOsmoPocket3)) {
    return DjiDeviceModelName.osmoPocket3;
  } else {
    return DjiDeviceModelName.unknown;
  }
}

export function isDjiDevice(manufacturerData: Buffer): boolean {
  return manufacturerData.subarray(0, 2).equals(djiTechnologyCoLtd || manufacturerData.subarray(0, 2).equals(djiTechnologyCoLtd_old);
}
