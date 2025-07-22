import { djiModelFromManufacturerData, djiModelNameFromManufacturerData, isDjiDevice } from '../src/model.js';
import { DjiDeviceModel, DjiDeviceModelName } from '../src/enums.js';

test('get model from manufacturer data', () => {
	expect(djiModelFromManufacturerData(Buffer.from([]))).toBe(null);
	expect(djiModelFromManufacturerData(Buffer.from([0xaa, 0x08, 0x00]))).toBe(null);

	expect(djiModelFromManufacturerData(Buffer.from([0xaa, 0x08, 0x00, 0x00]))).toBe(DjiDeviceModel.unknown);

	expect(djiModelFromManufacturerData(Buffer.from([0xaa, 0x08, 0x12, 0x00]))).toBe(DjiDeviceModel.osmoAction3);

	expect(djiModelFromManufacturerData(Buffer.from([0xaa, 0x08, 0x14, 0x00]))).toBe(DjiDeviceModel.osmoAction4);

	expect(djiModelFromManufacturerData(Buffer.from([0xaa, 0x08, 0x15, 0x00]))).toBe(DjiDeviceModel.osmoAction5Pro);

	expect(djiModelFromManufacturerData(Buffer.from([0xaa, 0x08, 0x20, 0x00]))).toBe(DjiDeviceModel.osmoPocket3);
});

test('get model name from manufacturer data', () => {
	expect(djiModelNameFromManufacturerData(Buffer.from([]))).toBe(null);
	expect(djiModelNameFromManufacturerData(Buffer.from([0xaa, 0x08, 0x00]))).toBe(null);

	expect(djiModelNameFromManufacturerData(Buffer.from([0xaa, 0x08, 0x00, 0x00]))).toBe(DjiDeviceModelName.unknown);

	expect(djiModelNameFromManufacturerData(Buffer.from([0xaa, 0x08, 0x12, 0x00]))).toBe(DjiDeviceModelName.osmoAction3);

	expect(djiModelNameFromManufacturerData(Buffer.from([0xaa, 0x08, 0x14, 0x00]))).toBe(DjiDeviceModelName.osmoAction4);

	expect(djiModelNameFromManufacturerData(Buffer.from([0xaa, 0x08, 0x15, 0x00]))).toBe(DjiDeviceModelName.osmoAction5Pro);

	expect(djiModelNameFromManufacturerData(Buffer.from([0xaa, 0x08, 0x20, 0x00]))).toBe(DjiDeviceModelName.osmoPocket3);
});

test('check if dji device', () => {
	expect(isDjiDevice(Buffer.from([0xaa, 0x08]))).toBe(true);

	expect(isDjiDevice(Buffer.from([0xa0, 0x08]))).toBe(false);
});

