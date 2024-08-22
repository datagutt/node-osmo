# node-osmo

Typescript library for controlling DJI Osmo Action 3, Action 4 and Pocket 3 using BLE (Bluetooth Low Energy)

Features:

- [x] Pairing
- [x] Connecting to Wi-Fi
- [x] Selecting resolution, FPS, bitrate and stabilizer mode
- [x] Going live to a specified RTMP server 
- [x] Getting battery percentage

## Getting Started

This project is intended to be used with the latest Active LTS release of Node.js.

## Available Scripts

- `clean` - remove coverage data, Jest cache and transpiled files,
- `prebuild` - lint source files and tests before building,
- `build` - transpile TypeScript to ES6,
- `build:watch` - interactive watch mode to automatically transpile source files,
- `lint` - lint source files and tests,
- `prettier` - reformat files,
- `test` - run tests,
- `test:watch` - interactive watch mode to automatically re-run tests

## Thanks
This library would not be possible without these great people and projects:

- [Spillmaker](https://github.com/spillmaker) - Initial reverse-engineering of the protocol
- [Moblin](https://github.com/eerimoq/moblin) - Implementation was highly inspired from this project

## License

Licensed under the MIT License. See the [LICENSE](https://github.com/datagutt/node-osmo/blob/main/LICENSE) file for details.
