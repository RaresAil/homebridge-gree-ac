import { Device } from 'gree-ac-api';
import {
  CharacteristicValue,
  Logger,
  PlatformAccessory,
  Service
} from 'homebridge';
import ACContext from './@types/ACContext';
import { Platform } from './platform';
import getStatus from './status';

export class PlatformAC {
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
        'Default-Serial'
      );

    this.service =
      this.accessory.getService(this.platform.Service.HeaterCooler) ||
      this.accessory.addService(this.platform.Service.HeaterCooler);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.device.Name
    );

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
  }

  private async handleActiveGet() {
    this.log.debug('Triggered GET Active');

    const status = await getStatus();
    return status.Pow;
  }

  private async handleActiveSet(value: CharacteristicValue) {
    this.log.debug('Triggered SET Active:', value);
  }

  private async handleCurrentHeaterCoolerStateGet() {
    this.log.debug('Triggered GET CurrentHeaterCoolerState');
    const status = await getStatus();

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
    this.log.debug('Triggered GET TargetHeaterCoolerState');

    const status = await getStatus();
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

  private async handleTargetHeaterCoolerStateSet(value: CharacteristicValue) {
    this.log.debug('Triggered SET TargetHeaterCoolerState:', value);
  }

  private async handleCurrentTemperatureGet() {
    this.log.debug('Triggered GET CurrentTemperature');
    const status = await getStatus();

    return status.SetTem;
  }

  private async handleTemperatureDisplayUnitsGet() {
    const status = await getStatus();
    return status.TemUn;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private handleTemperatureDisplayUnitsSet() {}
}
