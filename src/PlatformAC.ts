import { Logger, PlatformAccessory } from 'homebridge';
import { Device } from 'gree-ac-api';

import HeaterCooler from './services/HeaterCooler';
import ACContext from './@types/ACContext';
import { Platform } from './platform';
import ACLight from './services/ACLight';
import ACSpeed from './services/ACSpeed';

export class PlatformAC {
  public get UUID() {
    return this.accessory.UUID.toString();
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

    new HeaterCooler(this.platform, this.accessory);
    new ACSpeed(this.platform, this.accessory);
    new ACLight(this.platform, this.accessory);
  }
}
