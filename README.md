[![Build Status](https://travis-ci.org/danpoltawski/homebridge-thermostat-netatmo.svg?branch=master)](https://travis-ci.org/danpoltawski/homebridge-thermostat-netatmo)

# homebridge-thermostat-netatmo

A netatmo thermostat plugin for homebridge.

To use this plugin, you need to register an application on the Netatmo developer platform

1. Visit https://dev.netatmo.com/apps/createanapp#form (login with your netatmo account)
2. Fill out the required application fields
3. Copy and paste the client_id and client_secret into the configuraiton

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
