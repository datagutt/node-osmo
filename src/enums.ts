export enum DjiDeviceImageStabilization {
  Off = 'Off',
  RockSteady = 'RockSteady',
  RockSteadyPlus = 'RockSteady+',
  HorizonBalancing = 'HorizonBalancing',
  HorizonSteady = 'HorizonSteady',
}

export const djiDeviceImageStabilizations = Object.values(
  DjiDeviceImageStabilization,
);

export enum DjiDeviceResolution {
  r480p = '480p',
  r720p = '720p',
  r1080p = '1080p',
}

export enum DjiDeviceModel {
  osmoAction1,  
  osmoAction3,
  osmoAction4,
  osmoAction5Pro,
  osmoPocket3,
  unknown,
}
export enum DjiDeviceModelName {
  osmoAction1 = 'Osmo Action',
  osmoAction3 = 'Osmo Action 3',
  osmoAction4 = 'Osmo Action 4',
  osmoAction5Pro = 'Osmo Action 5 Pro',
  osmoPocket3 = 'Osmo Pocket 3',
  unknown = 'Unknown',
}
export const djiDeviceResolutions = Object.values(DjiDeviceImageStabilization);

export const djiDeviceBitrates: number[] = [
  20_000_000, 16_000_000, 12_000_000, 10_000_000, 8_000_000, 6_000_000,
  4_000_000, 2_000_000,
];

export const djiDeviceFpss: number[] = [25, 30];

export const getDjiDeviceModelName = (
  model: DjiDeviceModel,
): DjiDeviceModelName => {
  switch (model) {
    case DjiDeviceModel.osmoAction1:
      return DjiDeviceModelName.osmoAction1;      
    case DjiDeviceModel.osmoAction3:
      return DjiDeviceModelName.osmoAction3;
    case DjiDeviceModel.osmoAction4:
      return DjiDeviceModelName.osmoAction4;
    case DjiDeviceModel.osmoAction5Pro:
      return DjiDeviceModelName.osmoAction5Pro;
    case DjiDeviceModel.osmoPocket3:
      return DjiDeviceModelName.osmoPocket3;
    case DjiDeviceModel.unknown:
      return DjiDeviceModelName.unknown;
  }
};
