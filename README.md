# Gree AC Platform (homebridge-gree-ac-platform)

This plugin automatically detects Gree AC's and add them as accessories with the following features:

- Heating (With configs for min and max temperature values)
- Cooling (With configs for min and max temperature values)
- Temperature Unit can't be changed, but if is changed from the normal remote,
  it will be updated in the app.
- If you disconnect an AC and reconnect it to wifi, it will automatically bind to it
  no manual action is required
- Fan speeds for 3 Speed units and 5 Speed units

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
      "heatingMaxTemp": 30
    }
  ]
}
```

## Credits

Based on `tomikaa87` research on https://github.com/tomikaa87/gree-remote
using a NodeJS API implementation made by me at https://github.com/RaresAil/gree-ac-node-api
