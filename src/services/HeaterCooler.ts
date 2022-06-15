import { EventEmitter } from 'stream';
import {
  CharacteristicValue,
  PlatformAccessory,
  Characteristic,
  Service
} from 'homebridge';

import getStatus, { GetStatusFunc } from '../utils/acStatus';
import readData, { ReadDataFunc } from '../utils/dhtSensor';
import sendData, { SendDataFunc } from '../utils/acSender';
import { Platform } from '../platform';

export default class HeaterCooler {
  private readonly service: Service;

  public readonly activeChar: Characteristic;

  public readonly eventEmitter: EventEmitter;
  private readonly readDHTData: ReadDataFunc;
  private readonly getStatus: GetStatusFunc;
  private readonly sendData: SendDataFunc;

  public readonly EVENT = 'action';

  constructor(
    private readonly platform: Platform,
    private readonly accessory: PlatformAccessory
  ) {
    this.eventEmitter = new EventEmitter();
    this.service =
      this.accessory.getService(this.platform.Service.HeaterCooler) ||
      this.accessory.addService(this.platform.Service.HeaterCooler);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.Name
    );

    this.getStatus = getStatus(this.accessory.context.device);
    this.sendData = sendData(this.accessory.context.device);
    this.readDHTData = readData(
      this.accessory.context.device,
      this.platform.config as any
    );

    this.activeChar = this.service
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
    let temp = this.platform.config.defaultCurrentTemp ?? 45;
    if (this.platform.config.dhtService) {
      temp = (await this.readDHTData())?.temperature ?? temp;
    }

    return temp;
  }

  private async handleThresholdTemperatureGet() {
    const status = await this.getStatus();
    return status.SetTem;
  }

  private async handleTemperatureDisplayUnitsGet() {
    const status = await this.getStatus();
    return status.TemUn;
  }

  // Setters

  private async handleActiveSet(value: CharacteristicValue) {
    await this.sendData({
      Pow: parseInt(value.toString())
    });

    this.eventEmitter.emit(this.EVENT, 'Pow', parseInt(value.toString()));
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

    this.eventEmitter.emit(this.EVENT, 'Mod', parseInt(value.toString()));
  }

  private async handleThresholdTemperatureSet(value: CharacteristicValue) {
    await this.sendData({
      SetTem: parseInt(value.toString())
    });

    this.eventEmitter.emit(this.EVENT, 'SetTem', parseInt(value.toString()));
  }

  private handleTemperatureDisplayUnitsSet() {
    return undefined;
  }
}
