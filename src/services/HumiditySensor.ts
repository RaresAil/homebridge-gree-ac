import { PlatformAccessory, Service } from 'homebridge';
import { Platform } from '../platform';

import readData, { ReadDataFunc } from '../utils/dhtSensor';

export default class HumiditySensor {
  private readonly service: Service;
  private readonly readData: ReadDataFunc;

  constructor(
    private readonly platform: Platform,
    private readonly accessory: PlatformAccessory
  ) {
    this.service =
      this.accessory.getService(this.platform.Service.HumiditySensor) ||
      this.accessory.addService(this.platform.Service.HumiditySensor);

    this.readData = readData(
      this.accessory.context.device,
      this.platform.config as any
    );

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.handleCurrentRelativeHumidityGet.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(this.handleStatusActiveGet.bind(this));
  }

  private async handleCurrentRelativeHumidityGet() {
    const data = await this.readData();
    return data?.humidity ?? 0;
  }

  private async handleStatusActiveGet() {
    const data = await this.readData();
    return !!data?.humidity;
  }
}
