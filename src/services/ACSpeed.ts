import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import getStatus, { GetStatusFunc } from '../utils/acStatus';
import sendData, { SendDataFunc } from '../utils/acSender';
import { Platform } from '../platform';

export default class ACSpeed {
  private readonly service: Service;
  private readonly speedLevels = {
    three: 4,
    five: 6
  };

  private readonly getStatus: GetStatusFunc;
  private readonly sendData: SendDataFunc;

  constructor(
    private readonly platform: Platform,
    private readonly accessory: PlatformAccessory
  ) {
    this.service =
      this.accessory.getService(this.platform.Service.Fan) ||
      this.accessory.addService(this.platform.Service.Fan);

    this.getStatus = getStatus(this.accessory.context.device);
    this.sendData = sendData(this.accessory.context.device);

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(this.handleRotationSpeedGet.bind(this))
      .setProps({
        minStep: 1,
        minValue: 0,
        maxValue: this.platform.config.threeSpeedUnit
          ? this.speedLevels.three
          : this.speedLevels.five
      })
      .onSet(this.handleRotationSpeedSet.bind(this));
  }

  private async handleOnGet() {
    const status = await this.getStatus();
    return status.Pow === 1;
  }

  private async handleOnSet(value: CharacteristicValue) {
    await this.sendData({
      Pow: value ? 1 : 0
    });
  }

  private async handleRotationSpeedGet() {
    const status = await this.getStatus();
    let rotationSpeed = 0;

    if (this.platform.config.threeSpeedUnit) {
      switch (parseInt(status.WdSpd.toString())) {
        case 1:
          rotationSpeed = 1;
          break;
        case 3:
          rotationSpeed = 2;
          break;
        case 5:
          rotationSpeed = 3;
          break;
        default:
          rotationSpeed = 0;
          break;
      }
    } else {
      rotationSpeed = parseInt(status.WdSpd.toString());
    }

    if (status.Tur) {
      rotationSpeed = this.platform.config.threeSpeedUnit
        ? this.speedLevels.three
        : this.speedLevels.five;
    }

    return rotationSpeed;
  }

  private async handleRotationSpeedSet(value: CharacteristicValue) {
    const speedLevel = parseInt(value.toString());
    let realSpeedLevel = speedLevel;
    let isTurbo = 0;

    if (this.platform.config.threeSpeedUnit) {
      switch (speedLevel) {
        case 1:
          realSpeedLevel = 1;
          break;
        case 2:
          realSpeedLevel = 3;
          break;
        case 3:
        case 4:
          realSpeedLevel = 5;
          break;
        default:
          realSpeedLevel = 0;
          break;
      }
    }

    if (
      speedLevel >=
      (this.platform.config.threeSpeedUnit
        ? this.speedLevels.three
        : this.speedLevels.five)
    ) {
      isTurbo = 1;
    }

    await this.sendData({
      WdSpd: realSpeedLevel,
      Tur: isTurbo
    });
  }
}
