import { Status } from 'gree-ac-api/lib/@types';
import { Device } from 'gree-ac-api';
import AsyncLock from 'async-lock';

const lock = new AsyncLock();

interface Cache {
  countdown?: NodeJS.Timeout;
  commandsToExecute?: Partial<Status>;
}

const cache: {
  [key: string]: Cache;
} = {};

export type SendDataFunc = (data: Partial<Status>) => Promise<void>;

const sendData = (device: Device) => async (data: Partial<Status>) => {
  return lock.acquire(`get-cmd-${device.FullInfo.id}`, () => {
    if (!cache[device.FullInfo.id.toString()]) {
      cache[device.FullInfo.id.toString()] = {
        countdown: undefined,
        commandsToExecute: undefined
      };
    }

    if (cache[device.FullInfo.id.toString()]?.countdown) {
      clearTimeout(cache[device.FullInfo.id.toString()].countdown!);
    }

    cache[device.FullInfo.id.toString()].commandsToExecute = {
      ...(cache[device.FullInfo.id.toString()].commandsToExecute ?? {}),
      ...data
    };

    cache[device.FullInfo.id.toString()].countdown = setTimeout(() => {
      if (cache[device.FullInfo.id.toString()].commandsToExecute) {
        device.sendCommand('CMD', {
          ...cache[device.FullInfo.id.toString()].commandsToExecute
        });
      }

      cache[device.FullInfo.id.toString()].commandsToExecute = undefined;
      cache[device.FullInfo.id.toString()].countdown = undefined;
    }, 150);
  });
};

export default sendData;
