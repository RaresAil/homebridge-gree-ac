import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic
} from 'homebridge';

import { DeviceFullInfo } from 'gree-ac-api/lib/@types';
import { Device, DeviceFinder } from 'gree-ac-api';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import ACContext from './@types/ACContext';
import { PlatformAC } from './PlatformAC';

export class Platform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory<ACContext>[] = [];
  private readonly registeredDevices: PlatformAC[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    DeviceFinder.on('device-updated', this.onDeviceUpdated.bind(this));
    DeviceFinder.on('device-found', this.onDeviceFound.bind(this));

    this.log.debug('Finished initializing platform:', this.config.name);
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      DeviceFinder.scan(this.config.broadcastAddress, 0);
    });
  }

  configureAccessory(accessory: PlatformAccessory<ACContext>) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  private onDeviceFound(device: Device) {
    const uuid = this.api.hap.uuid.generate(device.FullInfo.id);
    const existingAccessory = this.accessories.find(
      (accessory) => accessory.UUID === uuid
    );

    if (!existingAccessory) {
      this.log.info('Adding new accessory:', device.Name);
      const accessory = new this.api.platformAccessory<ACContext>(
        device.Name,
        uuid
      );
      accessory.context = {
        data: device.FullInfo,
        device: device
      };

      this.registeredDevices.push(new PlatformAC(this, accessory, this.log));
      return this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
        accessory
      ]);
    }

    this.log.info(
      'Restoring existing accessory from cache:',
      existingAccessory.displayName
    );
    existingAccessory.context = {
      data: device.FullInfo,
      device: device
    };
    this.registeredDevices.push(
      new PlatformAC(this, existingAccessory, this.log)
    );
  }

  private onDeviceUpdated(oldDeviceInfo: DeviceFullInfo, newDevice: Device) {
    const uuid = this.api.hap.uuid.generate(oldDeviceInfo.id);
    const device = this.registeredDevices.find((plat) => plat.UUID === uuid);

    if (device) {
      this.api.updatePlatformAccessories([device.updateDevice(newDevice)]);
    }
  }
}
