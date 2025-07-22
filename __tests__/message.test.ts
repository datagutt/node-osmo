import {
	DjiMessage, DjiMessageWithData,
	DjiPairMessagePayload,
	DjiPreparingToLivestreamMessagePayload,
	DjiSetupWifiMessagePayload,
	DjiStartStreamingMessagePayload,
	DjiConfirmStartStreamingMessagePayload,
	DjiStopStreamingMessagePayload,
	DjiConfigureMessagePayload,
} from '../src/message.js';
import { DjiDeviceResolution, DjiDeviceImageStabilization } from '../src/enums.js';

test('parse message', () => {
	const message = new DjiMessage(
		513,
		6363,
		8389120,
		Buffer.from(Uint8Array.from([0x01, 0x02, 0x80, 0x00, 0x01, 0x4d, 0xed, 0x00, 0x00, 0x21, 0xea, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xbe, 0x15, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00]).buffer),
	);
	expect(new DjiMessageWithData(Buffer.from(Uint8Array.from(message.encode()).buffer))).toEqual(message);

	expect(message.format()).toBe('DjiMessage(target=513, id=6363, type=8389120, payload=01028000014ded000021ea000000000000be150000000000000000000000000000460000010000000000000000000000000000000000000000010000)')
});

test('check throws', () => {
	expect(() => 
		new DjiMessageWithData(Buffer.from(Uint8Array.from(
			[0x53, 0x04, 0x04, 0x52]
		).buffer))
	).toThrowError('Bad first byte');

	expect(() => 
		new DjiMessageWithData(Buffer.from(Uint8Array.from(
			[0x55, 0x05, 0x04, 0x52]
		).buffer))
	).toThrowError('Bad length');

	expect(() => 
		new DjiMessageWithData(Buffer.from(Uint8Array.from(
			[0x55, 0x04, 0x03, 0x52]
		).buffer))
	).toThrowError('Bad version');

	expect(() => 
		new DjiMessageWithData(Buffer.from(Uint8Array.from(
			[0x55, 0x04, 0x04, 0x52]
		).buffer))
	).toThrowError(`Calculated CRC 129 does not match received CRC ${0x52}`);

	const message = new DjiMessage(
		1,
		1,
		1,
		Buffer.from(Uint8Array.from([0x00]).buffer),
	);
	const data = message.encode();

	const calculated = data.readUint16LE(data.length - 2);
	data[data.length - 2] = data[data.length - 2] - 1;
	data[data.length - 1] = data[data.length - 1] - 1;
	const crc = data.readUint16LE(data.length - 2);
	expect(() => 
		new DjiMessageWithData(Buffer.from(Uint8Array.from(
			data
		).buffer))
	).toThrowError(`Calculated CRC ${calculated} does not match received CRC ${crc}`);
});


describe('MessagePayload checks', () => {
	let message;

	test('DjiPairMessagePayload works', () => {
		message = new DjiPairMessagePayload('love');
		expect(message.encode()).toEqual(Buffer.from([
			0x20, 0x32, 0x38, 0x34, 0x61, 0x65, 0x35, 0x62, 0x38, 0x64, 0x37, 0x36,
			0x62, 0x33, 0x33, 0x37, 0x35, 0x61, 0x30, 0x34, 0x61, 0x36, 0x34, 0x31,
			0x37, 0x61, 0x64, 0x37, 0x31, 0x62, 0x65, 0x61, 0x33,

			// length, L, O, V, E
			4, 108, 111, 118, 101
		]));
	});

	test('DjiPreparingToLivestreamMessagePayload works', () => {
		message = new DjiPreparingToLivestreamMessagePayload();
		expect(message.encode()).toEqual(Buffer.from([
			0x1a
		]));
	});

	test('DjiSetupWifiMessagePayload works', () => {
		message = new DjiSetupWifiMessagePayload('ssid', 'password');
		expect(message.encode()).toEqual(Buffer.from([
			4, 115, 115, 105, 100,
			8, 112, 97, 115, 115, 119, 111, 114, 100
		]));
	});

	test('DjiStartStreamingMessagePayload works', () => {
		message = new DjiStartStreamingMessagePayload('rtmp://localhost:4700', DjiDeviceResolution.r480p, 25, 5000, false);
		expect(message.encode()).toEqual(Buffer.from([
			0x00,
			0x2e, // 
			0x00,
			0x47, // 480p
			136, 19, // 5000
			0x02, 0x00,
			0x02, // 25 fps
			0x00, 0x00, 0x00,
			21, 0,
			114, 116, 109, 112, 58, 47, 47, 108, 111, 99, 97, 108, 104, 111, 115, 116, 58, 52, 55, 48, 48,
		]));

		message = new DjiStartStreamingMessagePayload('rtmp://localhost:4700', DjiDeviceResolution.r720p, 30, 5000, false);
		expect(message.encode()).toEqual(Buffer.from([
			0x00,
			0x2e, // 
			0x00,
			0x04, // 720p
			136, 19, // 5000
			0x02, 0x00,
			0x03, // 30fps
			0x00, 0x00, 0x00,
			21, 0,
			114, 116, 109, 112, 58, 47, 47, 108, 111, 99, 97, 108, 104, 111, 115, 116, 58, 52, 55, 48, 48,
		]));

		message = new DjiStartStreamingMessagePayload('rtmp://localhost:4700', DjiDeviceResolution.r1080p, 60, 5000, true);
		expect(message.encode()).toEqual(Buffer.from([
			0x00,
			0x2a, // 
			0x00,
			0x0a, // 1080p
			136, 19, // 5000
			0x02, 0x00,
			0x00, // unknown fps
			0x00, 0x00, 0x00,
			21, 0,
			114, 116, 109, 112, 58, 47, 47, 108, 111, 99, 97, 108, 104, 111, 115, 116, 58, 52, 55, 48, 48,
		]));

		message = new DjiStartStreamingMessagePayload('rtmp://localhost:4700', DjiDeviceResolution.r1080p + 1 as DjiDeviceResolution, 30, 5000, false);
		expect(() => message.encode()).toThrowError('Unknown resolution');
	});

	test('DjiConfirmStartStreamingMessagePayload works', () => {
		message = new DjiConfirmStartStreamingMessagePayload();
		expect(message.encode()).toEqual(Buffer.from([
			0x01, 0x01, 0x1a, 0x00, 0x01, 0x01
		]));
	});

	test('DjiStopStreamingMessagePayload works', () => {
		message = new DjiStopStreamingMessagePayload();
		expect(message.encode()).toEqual(Buffer.from([
			0x01, 0x01, 0x1a, 0x00, 0x01, 0x02
		]));
	});

	test('DjiConfigureMessagePayload works', () => {
		message = new DjiConfigureMessagePayload(DjiDeviceImageStabilization.Off, false);
		expect(message.encode()).toEqual(Buffer.from([
			0x01, 0x01,
			0x08,
			0x00, 0x01,
			0
		]));

		message = new DjiConfigureMessagePayload(DjiDeviceImageStabilization.RockSteady, false);
		expect(message.encode()).toEqual(Buffer.from([
			0x01, 0x01,
			0x08,
			0x00, 0x01,
			1
		]));

		message = new DjiConfigureMessagePayload(DjiDeviceImageStabilization.HorizonSteady, false);
		expect(message.encode()).toEqual(Buffer.from([
			0x01, 0x01,
			0x08,
			0x00, 0x01,
			2
		]));

		message = new DjiConfigureMessagePayload(DjiDeviceImageStabilization.RockSteadyPlus, false);
		expect(message.encode()).toEqual(Buffer.from([
			0x01, 0x01,
			0x08,
			0x00, 0x01,
			3
		]));

		message = new DjiConfigureMessagePayload(DjiDeviceImageStabilization.HorizonBalancing, true);
		expect(message.encode()).toEqual(Buffer.from([
			0x01, 0x01,
			0x1a,
			0x00, 0x01,
			4
		]));

		message = new DjiConfigureMessagePayload(DjiDeviceImageStabilization.RockSteady + 1 as DjiDeviceImageStabilization, false);
		expect(() => message.encode()).toThrowError('Unknown image stabilization');
	});
});
