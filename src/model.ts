import { Model } from './enums.js';

export const manufacturerDataIdentifier = Buffer.from([0xaa, 0x08]);
export const manufacturerDataOsmoAction3Id = Buffer.from([0x12, 0x00]);
export const manufacturerDataOsmoAction4Id = Buffer.from([0x14, 0x00]);
export const manufacturerDataOsmoAction5ProId = Buffer.from([0x15, 0x00]);
export const manufacturerDataOsmoPocket3Id = Buffer.from([0x20, 0x00]);

const readCharacteristicsUUID = Buffer.from([0xff, 0xf4]);
const writeCharacteristicsUUID = Buffer.from([0xff, 0xf5]);
const oa5WriteCharacteristicsUUID = Buffer.from([0xff, 0xf3]);

export function getReadCharacteristicsUUID(_model: Model): Buffer {
  return readCharacteristicsUUID;
}

export function getWriteCharacteristicsUUID(model: Model): Buffer {
  if (model === Model.oa5pro) {
    return oa5WriteCharacteristicsUUID;
  }
  return writeCharacteristicsUUID;
}

export const part_cmd_startbit = Buffer.from([0x55]);

export function getModelFromManufacturerData(
  manufacturerData: Buffer,
): Model | null {
  if (manufacturerData.length < 4) {
    return null;
  }

  if (!manufacturerData.subarray(0, 2).equals(manufacturerDataIdentifier)) {
    return null;
  }

  const modelData = manufacturerData.subarray(2, 4);
  if (modelData.equals(manufacturerDataOsmoAction3Id)) {
    return Model.oa3;
  } else if (modelData.equals(manufacturerDataOsmoAction4Id)) {
    return Model.oa4;
  } else if (modelData.equals(manufacturerDataOsmoAction5ProId)) {
    return Model.oa5pro;
  } else if (modelData.equals(manufacturerDataOsmoPocket3Id)) {
    return Model.op3;
  } else {
    return null;
  }
}

export interface Statistics {
  id: string; // UUID
  timeStamp: Date;
  bitrate?: number;
  temperature: number;
  battery: number;
}
