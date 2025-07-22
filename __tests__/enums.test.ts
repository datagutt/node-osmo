import { DjiDeviceModel, getDjiDeviceModelName } from '../src/enums.js';

test('check model names', () => {
	expect(getDjiDeviceModelName(DjiDeviceModel.unknown)).toBe('Unknown');

	expect(getDjiDeviceModelName(DjiDeviceModel.osmoAction3)).toBe('Osmo Action 3');

	expect(getDjiDeviceModelName(DjiDeviceModel.osmoAction4)).toBe('Osmo Action 4');

	expect(getDjiDeviceModelName(DjiDeviceModel.osmoAction5Pro)).toBe('Osmo Action 5 Pro');

	expect(getDjiDeviceModelName(DjiDeviceModel.osmoPocket3)).toBe('Osmo Pocket 3');
});

