import { Device } from 'gree-ac-api';
import {
  CharacteristicValue,
  Logger,
  PlatformAccessory,
  Service
} from 'homebridge';
import ACContext from './@types/ACContext';
import { Platform } from './platform';
import getStatus, { GetStatusFunc } from './status';
import sendData, { SendDataFunc } from './sender';

const speedSteps = {
  three: 30,
  five: 18
};

export class PlatformAC {
  private readonly getStatus: GetStatusFunc;
  private readonly sendData: SendDataFunc;
  private readonly service: Service;

  public get UUID() {
    return this.accessory.UUID.toString();
  }

  public get Accessory() {
    return this.accessory;
  }

  public updateDevice(newDevice: Device) {
    this.accessory.context.device = newDevice;
    this.accessory.context.data = newDevice.FullInfo;
    return this.accessory;
  }

  constructor(
    private readonly platform: Platform,
    private accessory: PlatformAccessory<ACContext>,
    private readonly log: Logger
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Gree')
      .setCharacteristic(this.platform.Characteristic.Model, 'Gree')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        accessory.context.data.mac
      );

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
      .onGet(this.handleThresholdTemperatureGet.bind(this))
      .onSet(this.handleThresholdTemperatureSet.bind(this));

    this.service
      .getCharacteristic(
        this.platform.Characteristic.HeatingThresholdTemperature
      )
      .onGet(this.handleThresholdTemperatureGet.bind(this))
      .onSet(this.handleThresholdTemperatureSet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .onGet(this.handleRotationSpeedGet.bind(this))
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
      let realSpeed = 0;
      switch (status.WdSpd) {
        case 1:
          realSpeed = 1;
          break;
        case 3:
          realSpeed = 2;
          break;
        case 5:
          realSpeed = 3;
          break;
        default:
          realSpeed = 0;
          break;
      }

      rotationSpeed = realSpeed * speedSteps.three;
    } else {
      rotationSpeed = status.WdSpd * speedSteps.five;
    }

    if (status.Tur) {
      rotationSpeed = 100;
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
    const speedPercentage = parseFloat(value.toString());
    const speedLevel = Math.round(
      speedPercentage /
        (this.platform.config.threeSpeedUnit
          ? speedSteps.three
          : speedSteps.five)
    );
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
          realSpeedLevel = 5;
          break;
        default:
          realSpeedLevel = 0;
          break;
      }
    }

    if (speedPercentage >= 90) {
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
