import { Device } from 'gree-ac-api';
import AsyncLock from 'async-lock';
import fetch from 'node-fetch';
import { URL } from 'url';

const lock = new AsyncLock();

export interface DHTData {
  temperature: number;
  humidity: number;
}

let cache:
  | {
      data: DHTData;
      setAt: number;
    }
  | undefined = undefined;
let tries = 0;

const exec = async (
  device: Device,
  config: { dhtService: string | undefined }
): Promise<DHTData | undefined> => {
  try {
    if (!config.dhtService) {
      return;
    }

    if (cache?.setAt && Date.now() - cache.setAt < 150) {
      return cache.data;
    }

    const url = new URL(config.dhtService);
    const data = (await (await fetch(url.toString())).json()) as Record<
      string,
      number
    >;

    if (Number.isNaN(data?.temperature ?? '')) {
      return undefined;
    }

    cache = {
      data: {
        temperature: data.temperature ?? 0,
        humidity: data.humidity ?? 0
      },
      setAt: Date.now()
    };

    return cache!.data;
  } catch (err) {
    if (tries >= 1) {
      return undefined;
    }

    tries += 1;
    return exec(device, config);
  }
};

export type ReadDataFunc = () => Promise<DHTData | undefined>;

const readData =
  (device: Device, config: { dhtService: string | undefined }) =>
  async (): Promise<DHTData | undefined> => {
    return lock.acquire(`get-status-${device.FullInfo.id}`, () =>
      exec(device, config)
    );
  };

export default readData;
