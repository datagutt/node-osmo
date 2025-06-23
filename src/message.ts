import { CRC } from 'crc-full';
import {
  BroadcastEISMode,
  BroadcastResolution,
  BroadcastStatus,
  Model,
} from './enums.js';
import { part_cmd_startbit } from './model.js';

const crc8Calculator = new CRC('CRC8', 8, 0x31, 0xee, 0x00, true, true);
function djiCrc8(data: Buffer): Buffer {
  return Buffer.from([crc8Calculator.compute(data)]);
}

const crc16Calculator = new CRC(
  'CRC16',
  16,
  0x1021,
  0x496c,
  0x0000,
  true,
  true,
);
function djiCrc16(data: Buffer): Buffer {
  const crc = crc16Calculator.compute(data);
  return Buffer.from([crc & 0xff, (crc >> 8) & 0xff]);
}

function generateSizeBit(data: Buffer): Buffer {
  const size = data.length + 2; // We add two to make sure we count the not yet added crc bits
  return Buffer.from([size]);
}

function generateFullPayload(
  command: Buffer,
  id: Buffer,
  type: Buffer,
  data: Buffer,
): Buffer | null {
  if (command.length !== 2) {
    return null;
  }
  if (id.length !== 2) {
    return null;
  }
  if (type.length !== 3 && type.length !== 4) {
    return null;
  }

  let fullData = Buffer.concat([
    part_cmd_startbit,
    Buffer.from([0xff]), // Placeholder for size
    Buffer.from([0x04]), // Spacer
    Buffer.from([0xff]), // Placeholder for crc8
    command,
    id,
    type,
    data,
  ]);

  const sizeBit = generateSizeBit(fullData);
  fullData[1] = sizeBit[0];

  fullData[3] = djiCrc8(fullData.subarray(0, 3))[0];

  fullData = Buffer.concat([fullData, djiCrc16(fullData)]);

  return fullData;
}

export function getNextCountBits(countBit: Buffer): Buffer {
  const nextBits = Buffer.from(countBit);
  if (nextBits[0] === 0xff) {
    nextBits[0] = 0x00;
    nextBits[1] += 1;
  } else {
    nextBits[0] += 1;
  }
  return nextBits;
}

function stringToHexData(input: string): Buffer {
  return Buffer.from(input, 'utf8');
}

export function getAuthCommand(pin: string, countBit: Buffer): Buffer | null {
  const commandBytes = Buffer.from([0x02, 0x07]);
  const typeBytes = Buffer.from([0x40, 0x07, 0x45]);
  let dataBytes = Buffer.from([
    0x20, 0x32, 0x38, 0x34, 0x61, 0x65, 0x35, 0x62, 0x38, 0x64, 0x37, 0x36,
    0x62, 0x33, 0x33, 0x37, 0x35, 0x61, 0x30, 0x34, 0x61, 0x36, 0x34, 0x31,
    0x37, 0x61, 0x64, 0x37, 0x31, 0x62, 0x65, 0x61, 0x33, 0x04,
  ]);
  dataBytes = Buffer.concat([dataBytes, stringToHexData(pin)]);
  return generateFullPayload(commandBytes, countBit, typeBytes, dataBytes);
}

const set_broadcast_command = Buffer.from([
  0x55, 0x13, 0x04, 0x03, 0x02, 0x08, 0x6a, 0xc0, 0x40, 0x02, 0x8e, 0x01, 0x01,
  0x1a, 0x00, 0x01, 0x01,
]);

function updateChecksumBits(payload: Buffer): Buffer {
  const updatedPayload = Buffer.from(payload);
  updatedPayload[1] = generateSizeBit(payload)[0];
  updatedPayload[3] = djiCrc8(payload.subarray(0, 3))[0];
  return Buffer.concat([updatedPayload, djiCrc16(updatedPayload)]);
}

export function get_start_broadcast_command(): Buffer {
  return updateChecksumBits(set_broadcast_command);
}

export function get_initiate_broadcast_command(): Buffer {
  return Buffer.from([
    0x55, 0x0e, 0x04, 0x66, 0x02, 0x08, 0x12, 0x8c, 0x40, 0x02, 0xe1, 0x1a,
    0x11, 0xdf,
  ]);
}

export function get_stop_broadcast_command(): Buffer {
  const stopCommand = Buffer.from(set_broadcast_command);
  stopCommand[16] = 0x02;
  return updateChecksumBits(stopCommand);
}

function getBitrateHexes(bitrate: number): Buffer {
  const highByte = (bitrate >> 8) & 0xff;
  const lowByte = bitrate & 0xff;
  return Buffer.from([highByte, lowByte]);
}

function getCountDataBit(data: Buffer): Buffer {
  return Buffer.from([data.length]);
}

export function getWiFiConfigurationCommand(
  ssid: string,
  password: string,
): Buffer | null {
  const message = Buffer.concat([
    getCountDataBit(Buffer.from(ssid, 'utf8')),
    Buffer.from(ssid, 'utf8'),
    getCountDataBit(Buffer.from(password, 'utf8')),
    Buffer.from(password, 'utf8'),
  ]);

  return generateFullPayload(
    Buffer.from([0x02, 0x07]),
    Buffer.from([0xb2, 0xea]), // These seem to be static in swift, maybe should be dynamic?
    Buffer.from([0x40, 0x07, 0x47]),
    message,
  );
}

export function getRTMPConfigCommand(
  rtmpURL: string,
  bitrate: number,
  resolution: BroadcastResolution,
  fps: number,
  auto: boolean,
  eis: BroadcastEISMode,
  countBit: Buffer,
): Buffer | null {
  let message = Buffer.from([
    0x27, 0x00, 0x0a, 0x70, 0x17, 0x02, 0x00, 0x03, 0x00, 0x00, 0x00, 0x1c,
    0x00,
  ]);
  message = Buffer.concat([message, Buffer.from(rtmpURL, 'utf8')]);

  const rtmpUrlByteCount = Buffer.from(rtmpURL, 'utf8').length;
  message[11] = rtmpUrlByteCount;

  const bitrateData = getBitrateHexes(bitrate);
  message[4] = bitrateData[0];
  message[5] = bitrateData[1];

  if (fps === 25) {
    message[7] = 0x02;
  }
  if (fps === 30) {
    message[7] = 0x03;
  }
  if (fps === 60) {
    message[7] = 0x06;
  }

  switch (resolution) {
    case BroadcastResolution.sd:
      message[2] = 0x47;
      break;
    case BroadcastResolution.hd:
      message[2] = 0x04;
      break;
    case BroadcastResolution.fhd:
      message[2] = 0x0a;
      break;
  }

  message[6] = auto ? 0x01 : 0x00;

  const payload = generateFullPayload(
    Buffer.from([0x02, 0x08]),
    Buffer.from([0xbe, 0xea]), // Static again
    Buffer.from([0x40, 0x08, 0x78, 0x00]),
    message,
  );

  const eisMessage = Buffer.from([
    0x01, 0x01, 0x08, 0x00, 0x01, 0x02, 0xf0, 0x72,
  ]);
  switch (eis) {
    case BroadcastEISMode.off:
      eisMessage[5] = 0x00;
      break;
    case BroadcastEISMode.rockSteady:
      eisMessage[5] = 0x01;
      break;
    case BroadcastEISMode.rockSteadyPlus:
      eisMessage[5] = 0x03;
      break;
    case BroadcastEISMode.horizonBalancing:
      eisMessage[5] = 0x04;
      break;
    case BroadcastEISMode.horizonSteady:
      eisMessage[5] = 0x02;
      break;
  }
  const eisPayload = generateFullPayload(
    Buffer.from([0x02, 0x01]),
    countBit,
    Buffer.from([0x40, 0x02, 0x8e]),
    eisMessage,
  );

  if (!payload || !eisPayload) {
    return null;
  }

  return Buffer.concat([payload, eisPayload, get_start_broadcast_command()]);
}

export interface Message {
  rawData: Buffer;
}

export interface AuthEvent extends Message {
  isAuthenticated: boolean;
}

export interface BroadcastEvent extends Message {
  status: BroadcastStatus;
}

export interface StatusEvent extends Message {}

export interface UnknownEvent extends Message {}

export interface StatisticsMessage extends Message {
  bitrate?: number;
  temperature: number;
  battery: number;
}

export interface WifiListEvent extends Message {
  wifiStatus?: WiFiStatus;
  wifiItems: WiFiItem[];
}

export interface WiFiItem {
  ssid: string;
  band: WiFiBand;
}

export enum WiFiBand {
  _2_4GHz,
  _5GHz,
}

export enum WiFiStatus {
  connected,
  connectionFailed,
}

function twoBitsToDecimal(bits: Buffer): number {
  if (bits.length < 2) {
    return 0;
  }
  return bits[0] + bits[1] * 255;
}

function parseWifiListMessage(
  data: Buffer,
  model: Model,
): WifiListEvent | null {
  if (data[0] !== 0x55) return null;
  if (data[4] !== 0x07 || data[5] !== 0x02) return null;

  if (model === Model.oa5pro) {
    return { rawData: data, wifiItems: [] };
  }

  const wifiDataItems: Buffer[] = [];
  let bitCounter = 14;
  for (let i = 0; i < data.length - 2; i++) {
    if (i <= bitCounter) continue;

    const itemLength = data[i];
    wifiDataItems.push(data.subarray(i, i + itemLength));
    bitCounter += itemLength;
  }

  const wifiItems: WiFiItem[] = [];
  for (const wifiItem of wifiDataItems) {
    let band: WiFiBand;
    if (wifiItem[4] === 0x01) {
      band = WiFiBand._5GHz;
    } else if (wifiItem[4] === 0x00) {
      band = WiFiBand._2_4GHz;
    } else {
      return null;
    }

    const ssidData = wifiItem.subarray(6, wifiItem.length);
    const ssid = ssidData.toString('utf8');
    wifiItems.push({ ssid, band });
  }

  return { rawData: data, wifiItems };
}

export function parseNotifyMessage(data: Buffer, model: Model): Message {
  if (data.length < 6) {
    return { rawData: data } as UnknownEvent;
  }

  if (data[4] === 0x01 && data[5] === 0x02) {
    return { rawData: data } as UnknownEvent;
  }

  if (data[4] === 0x05 && data[5] === 0x02) {
    const bitrate = twoBitsToDecimal(data.subarray(12, 14));
    const temperature = twoBitsToDecimal(data.subarray(28, 30)) / 10;
    const battery = data[31];
    return {
      rawData: data,
      bitrate,
      temperature,
      battery,
    } as StatisticsMessage;
  }

  if (data[4] === 0x07 && data[5] === 0x02) {
    if (data[9] === 0x07 && data[10] === 0x45) {
      if (data[11] === 0x00 && data[12] === 0x01) {
        return { rawData: data, isAuthenticated: true } as AuthEvent;
      }
      if (data[11] === 0x00 && data[12] === 0x02) {
        return { rawData: data, isAuthenticated: false } as AuthEvent;
      }
      if (data[11] === 0x01 && data[12] === 0x10) {
        return { rawData: data, isAuthenticated: true } as AuthEvent;
      }
    }
    if (data[9] === 0x07 && data[10] === 0x46) {
      if (data[11] === 0x01) {
        return { rawData: data, isAuthenticated: true } as AuthEvent;
      }
      if (data[11] === 0x00 || data[11] === 0x02) {
        return { rawData: data, isAuthenticated: false } as AuthEvent;
      }
    }
    if (data[9] === 0x07 && data[10] === 0x47) {
      if (data[11] === 0x00) {
        return {
          rawData: data,
          wifiStatus: WiFiStatus.connected,
          wifiItems: [],
        } as WifiListEvent;
      }
      if (data[11] === 0x01) {
        return {
          rawData: data,
          wifiStatus: WiFiStatus.connectionFailed,
          wifiItems: [],
        } as WifiListEvent;
      }
    }
    if (data[9] === 0x07 && data[10] === 0xac) {
      const wifiList = parseWifiListMessage(data, model);
      if (wifiList) return wifiList;
    }
  }

  if (data[4] === 0x08 && data[5] === 0x02) {
    if (data[9] === 0x02 && data[10] === 0xe1) {
      return {
        rawData: data,
        status: BroadcastStatus.preparing,
      } as BroadcastEvent;
    }
    if (data[9] === 0xee && data[10] === 0x03) {
      if (data[12] === 0x08) {
        return {
          rawData: data,
          status: BroadcastStatus.live,
        } as BroadcastEvent;
      }
      if (data[12] === 0x09) {
        return {
          rawData: data,
          status: BroadcastStatus.readyForWiFiCredentials,
        } as BroadcastEvent;
      }
    }
  }

  if (
    (data[4] === 0x28 && data[5] === 0x02) ||
    (data[4] === 0x48 && data[5] === 0x02)
  ) {
    return { rawData: data } as UnknownEvent;
  }

  return { rawData: data } as UnknownEvent;
}
