import { DeviceFullInfo } from 'gree-ac-api/lib/@types';
import { Device } from 'gree-ac-api';

interface ACContext {
  data: DeviceFullInfo;
  device: Device;
}

export default ACContext;
