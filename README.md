# Gree AC Platform (homebridge-gree-ac-platform)

This plugin automatically detects Gree AC's and add them as accessories with the following features:

- Heating (With configs for min and max temperature values)
- Cooling (With configs for min and max temperature values)
- Temperature Unit can't be changed, but if is changed from the normal remote,
  it will be updated in the app.
- If you disconnect an AC and reconnect it to wifi, it will automatically bind to it
  no manual action is required
- Fan speeds for 3 Speed units and 5 Speed units
- Turn off/on the light
- In version 1.1.1 i improved the response time and speed.
- In version 1.1.1 when a status changes, now it updates all the services.
- In version 1.1.1 was removed the RE2 to improve the install speed.

## More features will come in future!

### For speed:

- 0 = Auto
- 1 = Low
- 2 = Medium-Low (not available on 3-speed units)
- 3 = Medium
- 4 = Medium-High (not available on 3-speed units)
- 5 = High
- 6 = Turbo (For all units, turbo is the max speed)

### Config:

```json
{
  "platforms": [
    {
      "name": "Gree ACs",
      // Set this to the router's broadcast address
      // in order to can scan for ACs
      "broadcastAddress": "192.168.1.255",
      // If is a 3-Speed unit, set this to true
      "threeSpeedUnit": true,
      "platform": "GreeACImplementationPlugin",
      "coolingMinTemp": 16,
      "coolingMaxTemp": 30,
      "heatingMinTemp": 16,
      "heatingMaxTemp": 30,
      "defaultCurrentTemp": 45,
      "dhtService": "http://localhost:55555"
    }
  ]
}
```

### DHT Service

In order to can get the humidity and temperature, you need a separate service to get that info (ONLY FOR RPi)

```js
const sensor = require('node-dht-sensor');
const express = require('express');

const app = express();

app.get('/', (_, res) => {
  sensor.read(11, 17, function (err, temperature, humidity) {
    if (!err) {
      res.status(200).json({
        temperature,
        humidity
      });
    } else {
      res.status(500).json({
        error: err.message,
        code: err.code ?? 500
      });
    }
  });
});

app.listen(55555, 'localhost', () => {
  console.log('Service Started');
});
```

## Credits

Based on `tomikaa87` research on https://github.com/tomikaa87/gree-remote
using a NodeJS API implementation made by me at https://github.com/RaresAil/gree-ac-node-api
