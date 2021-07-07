import { Status } from 'gree-ac-api/lib/@types';
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

const cache: {
  values: Status;
  setAt: number;
} = {
  values: defaults,
  setAt: 0
};

export default function getStatus() {
  return lock.acquire('get-status', async () => {
    if (Date.now() - cache.setAt < 6000) {
      return cache.values;
    }

    cache.setAt = Date.now();
    return cache.values;
  });
}
