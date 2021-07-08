import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import getStatus, { GetStatusFunc } from '../utils/acStatus';
import sendData, { SendDataFunc } from '../utils/acSender';
import { Platform } from '../platform';

export default class ACLight {
  private readonly service: Service;

  private readonly getStatus: GetStatusFunc;
  private readonly sendData: SendDataFunc;

  constructor(
    private readonly platform: Platform,
    private readonly accessory: PlatformAccessory
  ) {
    this.service =
      this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);

    this.getStatus = getStatus(this.accessory.context.device);
    this.sendData = sendData(this.accessory.context.device);

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));
  }

  private async handleOnGet() {
    const status = await this.getStatus();
    return status.Lig === 1;
  }

  private async handleOnSet(value: CharacteristicValue) {
    await this.sendData({
      Lig: value ? 1 : 0
    });
  }
}
