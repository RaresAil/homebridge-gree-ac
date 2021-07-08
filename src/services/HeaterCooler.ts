import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import getStatus, { GetStatusFunc } from '../utils/acStatus';
import sendData, { SendDataFunc } from '../utils/acSender';
import { Platform } from '../platform';

export default class HeaterCooler {
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
      this.accessory.getService(this.platform.Service.HeaterCooler) ||
      this.accessory.addService(this.platform.Service.HeaterCooler);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.Name
    );

    this.getStatus = getStatus(this.accessory.context.device);
    this.sendData = sendData(this.accessory.context.device);

    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))
      .onSet(this.handleActiveSet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.handleCurrentHeaterCoolerStateGet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .onGet(this.handleTargetHeaterCoolerStateGet.bind(this))
      .onSet(this.handleTargetHeaterCoolerStateSet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.handleTemperatureDisplayUnitsGet.bind(this))
      .onSet(this.handleTemperatureDisplayUnitsSet.bind(this));

    this.service
      .getCharacteristic(
        this.platform.Characteristic.CoolingThresholdTemperature
      )
      .setProps({
        minValue: this.platform.config.coolingMinTemp,
        maxValue: this.platform.config.coolingMaxTemp,
        minStep: 1
      })
      .onGet(this.handleThresholdTemperatureGet.bind(this))
      .onSet(this.handleThresholdTemperatureSet.bind(this));

    this.service
      .getCharacteristic(
        this.platform.Characteristic.HeatingThresholdTemperature
      )
      .setProps({
        minValue: this.platform.config.heatingMinTemp,
        maxValue: this.platform.config.heatingMaxTemp,
        minStep: 1
      })
      .onGet(this.handleThresholdTemperatureGet.bind(this))
      .onSet(this.handleThresholdTemperatureSet.bind(this));

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

  // Getters

  private async handleActiveGet() {
    const status = await this.getStatus();
    return status.Pow;
  }

  private async handleCurrentHeaterCoolerStateGet() {
    const status = await this.getStatus();

    if (!status.Pow) {
      return this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE;
    }

    switch (status.Mod) {
      case 1:
      case 2:
      case 3:
        return this.platform.Characteristic.CurrentHeaterCoolerState.COOLING;
      case 4:
        return this.platform.Characteristic.CurrentHeaterCoolerState.HEATING;
      default:
        return this.platform.Characteristic.CurrentHeaterCoolerState.IDLE;
    }
  }

  private async handleTargetHeaterCoolerStateGet() {
    const status = await this.getStatus();
    switch (status.Mod) {
      case 1:
      case 2:
      case 3:
        return this.platform.Characteristic.TargetHeaterCoolerState.COOL;
      case 4:
        return this.platform.Characteristic.TargetHeaterCoolerState.HEAT;
      default:
        return this.platform.Characteristic.TargetHeaterCoolerState.AUTO;
    }
  }

  private async handleCurrentTemperatureGet() {
    return 30;
  }

  private async handleThresholdTemperatureGet() {
    const status = await this.getStatus();
    return status.SetTem;
  }

  private async handleTemperatureDisplayUnitsGet() {
    const status = await this.getStatus();
    return status.TemUn;
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

  // Setters

  private async handleActiveSet(value: CharacteristicValue) {
    await this.sendData({
      Pow: parseInt(value.toString())
    });
  }

  private async handleTargetHeaterCoolerStateSet(value: CharacteristicValue) {
    const { TargetHeaterCoolerState } = this.platform.Characteristic;
    let readValue: number;

    switch (parseInt(value.toString())) {
      case TargetHeaterCoolerState.HEAT:
        readValue = 4;
        break;
      case TargetHeaterCoolerState.COOL:
        readValue = 1;
        break;
      default:
        readValue = 0;
        break;
    }

    await this.sendData({
      Mod: readValue
    });
  }

  private async handleThresholdTemperatureSet(value: CharacteristicValue) {
    await this.sendData({
      SetTem: parseInt(value.toString())
    });
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

  private handleTemperatureDisplayUnitsSet() {
    return undefined;
  }
}
