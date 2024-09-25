import { CRC } from 'crc-full';

import { DjiDeviceResolution, DjiDeviceImageStabilization } from './enums.js';
import { ByteBuf } from './bytebuf.js';

function djiCrc8(data: Buffer): number {
  const crc = new CRC('CRC8', 8, 0x31, 0xee, 0x00, true, true);
  return crc.compute(data);
}

function djiCrc16(data: Buffer): number {
  const crc = new CRC(
    'CRC16_CCITT_FALSE',
    16,
    0x1021,
    0x496c,
    0x0000,
    true,
    true,
  );
  return crc.compute(data);
}

function djiPackString(value: string): Buffer {
  const data = Buffer.from(value, 'utf8');
  return Buffer.concat([Buffer.from([data.length]), data]);
}

function djiPackUrl(url: string): Buffer {
  const data = Buffer.from(url, 'utf8');
  return Buffer.concat([Buffer.from([data.length, 0]), data]);
}

export class DjiMessage {
  target: number;
  id: number;
  type: number;
  payload: Buffer;

  constructor(target: number, id: number, type: number, payload: Buffer) {
    this.target = target;
    this.id = id;
    this.type = type;
    this.payload = payload;
  }

  encode(): Buffer {
    const header = Buffer.from([0x55, 13 + this.payload.length, 0x04]);
    const headerCrc = djiCrc8(header);
    const headerWithCrc = Buffer.concat([header, Buffer.from([headerCrc])]);

    const body = Buffer.concat([
      headerWithCrc,
      Buffer.from([this.target & 0xff, (this.target >> 8) & 0xff]),
      Buffer.from([this.id & 0xff, (this.id >> 8) & 0xff]),
      Buffer.from([
        this.type & 0xff,
        (this.type >> 8) & 0xff,
        (this.type >> 16) & 0xff,
      ]),
      this.payload,
    ]);

    const crc = djiCrc16(body);
    return Buffer.concat([body, Buffer.from([crc & 0xff, (crc >> 8) & 0xff])]);
  }

  format(): string {
    return `DjiMessage(target=${this.target}, id=${this.id}, type=${this.type}, payload=${this.payload.toString('hex')})`;
  }
}

export class DjiMessageWithData extends DjiMessage {
  data: Buffer;

  constructor(data: Buffer) {
    const reader = ByteBuf.from(data);
    if (reader.readUint8() !== 0x55) {
      throw new Error('Bad first byte');
    }
    const length = reader.readUint8();
    if (data.length !== length) {
      throw new Error('Bad length');
    }
    const version = reader.readUint8();
    if (version !== 0x04) {
      throw new Error('Bad version');
    }
    const headerCrc = reader.readUint8();
    const calculatedHeaderCrc = djiCrc8(data.subarray(0, 3));
    if (headerCrc !== calculatedHeaderCrc) {
      throw new Error(
        `Calculated CRC ${calculatedHeaderCrc} does not match received CRC ${headerCrc}`,
      );
    }
    const target = reader.readUint16(true); // LE
    const id = reader.readUint16(true); // LE
    const type = reader.readUint24(true); // LE
    const payload = reader.readBytes(reader.bytesRemaining - 2);
    const crc = reader.readUint16(true); // LE
    const calculatedCrc = djiCrc16(data.subarray(0, data.length - 2));
    if (crc !== calculatedCrc) {
      throw new Error(
        `Calculated CRC ${calculatedCrc} does not match received CRC ${crc}`,
      );
    }
    super(target, id, type, Buffer.from(payload));
  }
}

export class DjiPairMessagePayload {
  static payload = Buffer.from([
    0x20, 0x32, 0x38, 0x34, 0x61, 0x65, 0x35, 0x62, 0x38, 0x64, 0x37, 0x36,
    0x62, 0x33, 0x33, 0x37, 0x35, 0x61, 0x30, 0x34, 0x61, 0x36, 0x34, 0x31,
    0x37, 0x61, 0x64, 0x37, 0x31, 0x62, 0x65, 0x61, 0x33,
  ]);
  pairPinCode: string;

  constructor(pairPinCode: string) {
    this.pairPinCode = pairPinCode;
  }

  encode(): Buffer {
    const payload = DjiPairMessagePayload.payload;
    const pinCodeBuffer = djiPackString(this.pairPinCode);
    return Buffer.concat([payload, pinCodeBuffer]);
  }
}

export class DjiPreparingToLivestreamMessagePayload {
  static payload = Buffer.from([0x1a]);

  encode(): Buffer {
    return DjiPreparingToLivestreamMessagePayload.payload;
  }
}

export class DjiSetupWifiMessagePayload {
  wifiSsid: string;
  wifiPassword: string;

  constructor(wifiSsid: string, wifiPassword: string) {
    this.wifiSsid = wifiSsid;
    this.wifiPassword = wifiPassword;
  }

  encode(): Buffer {
    const ssidBuffer = djiPackString(this.wifiSsid);
    const passwordBuffer = djiPackString(this.wifiPassword);
    return Buffer.concat([ssidBuffer, passwordBuffer]);
  }
}

export class DjiStartStreamingMessagePayload {
  static payload1 = Buffer.from([0x00]);
  static payload2 = Buffer.from([0x00]);
  static payload3 = Buffer.from([0x02, 0x00]);
  static payload4 = Buffer.from([0x00, 0x00, 0x00]);
  rtmpUrl: string;
  resolution: DjiDeviceResolution;
  fps: number;
  bitrateKbps: number;
  oa5: boolean;

  constructor(
    rtmpUrl: string,
    resolution: DjiDeviceResolution,
    fps: number,
    bitrateKbps: number,
    oa5: boolean,
  ) {
    this.rtmpUrl = rtmpUrl;
    this.resolution = resolution;
    this.fps = fps;
    this.bitrateKbps = bitrateKbps;
    this.oa5 = oa5;
  }

  encode(): Buffer {
    let resolutionByte: number;
    switch (this.resolution) {
      case DjiDeviceResolution.r480p:
        resolutionByte = 0x47;
        break;
      case DjiDeviceResolution.r720p:
        resolutionByte = 0x04;
        break;
      case DjiDeviceResolution.r1080p:
        resolutionByte = 0x0a;
        break;
      default:
        throw new Error('Unknown resolution');
    }

    const bitrateBuffer = Buffer.from([
      this.bitrateKbps & 0xff,
      (this.bitrateKbps >> 8) & 0xff,
    ]);
    let fpsByte: number;
    switch (this.fps) {
      case 25:
        fpsByte = 2;
        break;
      case 30:
        fpsByte = 3;
        break;
      default:
        fpsByte = 0;
    }
    let byte1: number;
    if (this.oa5) {
      byte1 = 0x2a;
    } else {
      byte1 = 0x2e;
    }

    const fpsBuffer = Buffer.from([fpsByte]);
    const urlBuffer = djiPackUrl(this.rtmpUrl);

    return Buffer.concat([
      DjiStartStreamingMessagePayload.payload1,
      Buffer.from([byte1]),
      DjiStartStreamingMessagePayload.payload2,
      Buffer.from([resolutionByte]),
      bitrateBuffer,
      DjiStartStreamingMessagePayload.payload3,
      fpsBuffer,
      DjiStartStreamingMessagePayload.payload4,
      urlBuffer,
    ]);
  }
}

export class DjiStopStreamingMessagePayload {
  static payload = Buffer.from([0x01, 0x01, 0x1a, 0x00, 0x01, 0x02]);

  encode(): Buffer {
    return DjiStopStreamingMessagePayload.payload;
  }
}

export class DjiConfigureMessagePayload {
  static payload1 = Buffer.from([0x01, 0x01]);
  static payload2 = Buffer.from([0x00, 0x01]);

  imageStabilization: DjiDeviceImageStabilization;
  oa5: boolean;

  constructor(imageStabilization: DjiDeviceImageStabilization, oa5: boolean) {
    this.imageStabilization = imageStabilization;
    this.oa5 = oa5;
  }

  encode(): Buffer {
    let imageStabilizationByte: number;
    switch (this.imageStabilization) {
      case DjiDeviceImageStabilization.Off:
        imageStabilizationByte = 0;
        break;
      case DjiDeviceImageStabilization.RockSteady:
        imageStabilizationByte = 1;
        break;
      case DjiDeviceImageStabilization.RockSteadyPlus:
        imageStabilizationByte = 3;
        break;
      case DjiDeviceImageStabilization.HorizonBalancing:
        imageStabilizationByte = 4;
        break;
      case DjiDeviceImageStabilization.HorizonSteady:
        imageStabilizationByte = 2;
        break;
      default:
        throw new Error('Unknown image stabilization');
    }
    let byte1: number;
    if (this.oa5) {
      byte1 = 0x1a;
    } else {
      byte1 = 0x08;
    }
    return Buffer.concat([
      DjiConfigureMessagePayload.payload1,
      Buffer.from([byte1]),
      DjiConfigureMessagePayload.payload2,
      Buffer.from([imageStabilizationByte]),
    ]);
  }
}
