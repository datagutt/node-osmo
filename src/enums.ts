export enum Model {
  oa3,
  oa4,
  oa5pro,
  op3,
}

export enum BroadcastResolution {
  sd = 480,
  hd = 720,
  fhd = 1080,
}

export enum BroadcastEISMode {
  off = 'Off',
  rockSteady = 'RockSteady',
  rockSteadyPlus = 'RockSteady +',
  horizonBalancing = 'HorizonBalancing',
  horizonSteady = 'HorizonSteady',
}

export enum Status {
  unauthorized,
  authorized,
}

export enum BroadcastStatus {
  inactive = 0,
  preparing = 10,
  readyForWiFiCredentials = 20,
  readyForRTMPCredentials = 30,
  connecting = 40,
  live = 50,
}

export const djiDeviceFpss: number[] = [25, 30, 60];
