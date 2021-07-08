import { Status } from 'gree-ac-api/lib/@types';
import { Device } from 'gree-ac-api';
import AsyncLock from 'async-lock';

const lock = new AsyncLock();
const defaults = {
  Pow: 0,
  Mod: 0,
  SetTem: 0,
  WdSpd: 0,
  Air: 0,
  Blo: 0,
  Health: 0,
  SwhSlp: 0,
  Lig: 0,
  SwingLfRig: 0,
  SwUpDn: 0,
  Quiet: 0,
  Tur: 0,
  StHt: 0,
  TemUn: 0,
  HeatCoolType: 0,
  TemRec: 0,
  SvSt: 0
};

interface Cache {
  values: Status;
  setAt: number;
}

const cache: {
  [key: string]: Cache;
} = {};

export type GetStatusFunc = () => Promise<Status>;

const getStatus = (device: Device) => async (): Promise<Status> => {
  return lock.acquire(
    `get-status-${device.FullInfo.id}`,
    async (): Promise<Status> => {
      if (!cache[device.FullInfo.id.toString()]) {
        cache[device.FullInfo.id.toString()] = {
          values: defaults,
          setAt: 0
        };
      }

      if (Date.now() - cache[device.FullInfo.id.toString()].setAt < 150) {
        return cache[device.FullInfo.id.toString()].values;
      }

      const status = (await device.sendCommand('STATUS')) as Status;
      cache[device.FullInfo.id.toString()].values = status;

      cache[device.FullInfo.id.toString()].setAt = Date.now();
      return cache[device.FullInfo.id.toString()].values;
    }
  );
};

export default getStatus;
