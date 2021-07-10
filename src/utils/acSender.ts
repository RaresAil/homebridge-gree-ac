import { Status } from 'gree-ac-api/lib/@types';
import { Device } from 'gree-ac-api';
import AsyncLock from 'async-lock';

const lock = new AsyncLock();

export type SendDataFunc = (data: Partial<Status>) => Promise<void>;

const sendData = (device: Device) => async (data: Partial<Status>) => {
  return lock.acquire(`get-cmd-${device.FullInfo.id}`, () => {
    device.sendCommand('CMD', {
      ...data
    });
  });
};

export default sendData;
