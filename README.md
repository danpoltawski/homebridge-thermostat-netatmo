[![Build Status](https://travis-ci.org/danpoltawski/homebridge-thermostat-netatmo.svg?branch=master)](https://travis-ci.org/danpoltawski/homebridge-thermostat-netatmo)

# homebridge-thermostat-netatmo

A plugin for homebridge.

# Configuration

```

"accessories": [
    {
        "accessory": "Netatmo Thermostat",
        "name": "Thermostat",
        "client_id": "<clientid from https://dev.netatmo.com/>",
        "client_secret": "<secret from https://dev.netatmo.com/>",
        "username": "",
        "password": ""
    }
],
