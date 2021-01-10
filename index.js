'use strict';
var Service, Characteristic;
var NetatmoAPI = require('./netatmo-api.js');

module.exports = function(homebridge){
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory('homebridge-thermostat-netatmo', 'Netatmo Thermostat', NetatmoThermostat);
};

class NetatmoThermostat {
    constructor(log, config) {
        this.log = log;

        this.name = config.name;
        this.device_id = null;
        this.module_id = null;

        this.temperatureDisplayUnits = Characteristic.TemperatureDisplayUnits.CELSIUS;
        this.temperature = 0;
        this.targetTemperature = 0;
        this.heatingThresholdTemperature = 0;

        this.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;

        this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.OFF;
        this.api = new NetatmoAPI(config.client_id, config.client_secret);
        this.auth = this.api.authenticate(config.username, config.password);
        this.thermostatService = new Service.Thermostat(this.name);
        this.refreshThermostat((error) => {
            if (error) {
                this.log('Error loading themostat data.');
            } else {
                this.log('Thermostat data loaded.');
            }
        });
    }

    refreshThermostat(callback) {
        this.log('Loading themostat data from server');

        this.auth.then((token) => {
            if (token.expired()) {
                return token.refresh();
            }
            return token;
        })
            .then(this.api.getThermostatState)
            .then( (data) => {
                this.device_id = data.device_id;
                this.module_id = data.module_id;
                this.temperature = parseFloat(data.temperature);
                this.targetTemperature = parseFloat(data.setPoint);
                this.heatingThresholdTemperature = this.targetTemperature;
                if (data.heatingOn) {
                    this.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.HEAT;
                } else {
                    this.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;
                }

                switch(data.mode) {
                case 'away':
                case 'hg':
                case 'off':
                    this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.OFF;
                    break;
                case 'manual':
                case 'max':
                    this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.HEAT;
                    break;
                case 'program':
                    this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.AUTO;
                    break;
                default:
                    this.log('Unknown setpoint state');
                }

                if (this.targetTemperature < 10){
                // Homekit only goes as low as 10.
                    this.targetTemperature = 10;
                }

                callback(null);
            }).catch((reason) => {
            // rejection
                callback(reason);
            });
    }

    setHeatingMode(callback) {
        this.log('Setting thermostat to heating MAX mode.');

        var setpointData = {
            device_id: this.device_id,
            module_id: this.module_id,
            mode: 'max',
        };

        this.setThermostat(setpointData, () => {
            this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.HEAT;
            this.targetTemperature = 30;
            this.heatingThresholdTemperature = 25; // Max value allowed by Homekit.
            this.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.HEAT;
            this.TargetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.HEAT;
            callback();
            // Force Characteristic updates..
            this.thermostatService.setCharacteristic(Characteristic.HeatingThresholdTemperature,
                this.heatingThresholdTemperature);
            this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState,
                this.heatingCoolingState);
        });
    }

    setFrostguardMode(callback) {
        this.log('Setting thermostat to frostguard Mode');

        var setpointData = {
            device_id: this.device_id,
            module_id: this.module_id,
            mode: 'hg',
        };

        this.setThermostat(setpointData, () => {
            this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.OFF;
            this.targetTemperature = 10; // Lowest value allowed by Homekit.
            this.heatingThresholdTemperature = 7;
            this.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;
            callback();
            // Force Characteristic updates..
            this.thermostatService.setCharacteristic(Characteristic.HeatingThresholdTemperature,
                this.heatingThresholdTemperature);
            this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState,
                this.heatingCoolingState);
        });
    }

    setAutoMode(callback) {
        this.log('Setting thermostat to auto schedule');

        var setpointData = {
            device_id: this.device_id,
            module_id: this.module_id,
            mode: 'program',
        };

        this.setThermostat(setpointData, () => {
            this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.AUTO;
            callback();
            // Force Characteristic updates..
            this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState,
                this.heatingCoolingState);
        });
    }

    setHeatingTo(temperature, callback) {
        if (temperature > 30) {
            // Max allowed by thermostat.
            temperature = 30;
        }

        if (temperature == this.targetTemperature) {
            callback();
            return;
        }

        this.log('Setting thermostat to ' + temperature);

        var setpointData = {
            device_id: this.device_id,
            module_id: this.module_id,
            temperature: temperature,
            mode: 'manual',
        };

        this.setThermostat(setpointData, () => {
            this.targetTemperature = temperature;
            this.heatingThresholdTemperature = temperature;
            if (temperature >= this.temperature) {
                this.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.HEAT;
                this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.HEAT;
            } else {
                this.heatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;
                this.targetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.COOL;
            }
            callback();
            // Force Characteristic updates..
            this.thermostatService.setCharacteristic(Characteristic.HeatingThresholdTemperature,
                this.heatingThresholdTemperature);
            this.thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState,
                this.heatingCoolingState);
            this.thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState,
                this.targetHeatingCoolingState);
        });
    }

    setThermostat(setpointData, callback) {
        // TODO. Implement some sort of queue systme to prevent multiple updates.
        this.auth.then((token) => {
            if (token.expired()) {
                return token.refresh();
            }
            return token;
        }).then( (token) => {
            setpointData['token'] = token;
            return this.api.setThermostat(setpointData);
        })
            .then( () => {
                callback(null);
            }).catch((reason) => {
            // rejection
                callback(reason);
                return;
            });
    }

    getCurrentHeatingCoolingState(callback) {
        this.log('getCurrentHeatingCoolingState:');
        this.refreshThermostat(function () {
            callback(null, this.heatingCoolingState);
        }.bind(this));
    }

    getTargetHeatingCoolingState(callback) {
        this.log('getTargetHeatingCoolingState:', this.targetHeatingCoolingState);
        callback(null, this.targetHeatingCoolingState);
    }

    setTargetHeatingCoolingState(value, callback) {
        this.log('setTargetHeatingCoolingState from/to:', this.targetHeatingCoolingState, value);

        if (this.targetHeatingCoolingState === value) {
            this.log('Doing nothing');
            callback(null);
            return;
        }

        switch (value) {
        case Characteristic.TargetHeatingCoolingState.OFF:
            this.log('Setting heating off.');
            this.setFrostguardMode(callback);
            break;
        case Characteristic.TargetHeatingCoolingState.HEAT:
            this.log('Setting to heat mode.');
            this.setHeatingMode(callback);
            break;
        case Characteristic.TargetHeatingCoolingState.AUTO:
            this.log('Setting to atio mode.');
            this.setAutoMode(callback);
            break;
        default:
            this.log('Unsupported mode:', value);
            callback('Unsupport mode');
            return;
        }
    }

    getCurrentTemperature(callback) {
        this.refreshThermostat(function () {
            this.log('getCurrentTemperature:', this.temperature);
            callback(null, this.temperature);
        }.bind(this));
    }

    getTargetTemperature(callback) {
        this.refreshThermostat(function () {
            this.log('getTargetTemperature:', this.targetTemperature);
            callback(null, this.targetTemperature);
        }.bind(this));
    }

    setTargetTemperature(value, callback) {
        this.log('setTargetTemperature:', value);
        this.setHeatingTo(value, function () {
            callback(null); // success
        });
    }

    getTemperatureDisplayUnits(callback) {
        this.log('getTemperatureDisplayUnits:', this.temperatureDisplayUnits);
        var error = null;
        callback(error, this.temperatureDisplayUnits);
    }

    setTemperatureDisplayUnits(value, callback) {
        this.log('setTemperatureDisplayUnits from %s to %s', this.temperatureDisplayUnits, value);
        this.temperatureDisplayUnits = value;
        var error = null;
        callback(error);
    }

    getHeatingThresholdTemperature(callback) {
        this.log('getHeatingThresholdTemperature :' , this.heatingThresholdTemperature);
        var error = null;
        callback(error, this.heatingThresholdTemperature);
    }

    getName(callback) {
        this.log('getName :', this.name);
        var error = null;
        callback(error, this.name);
    }

    getServices() {

        var informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Netatmo')
            .setCharacteristic(Characteristic.Model, 'Smart Thermostat');

        this.thermostatService
            .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
            .on('get', this.getCurrentHeatingCoolingState.bind(this));

        this.thermostatService
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .on('get', this.getTargetHeatingCoolingState.bind(this))
            .on('set', this.setTargetHeatingCoolingState.bind(this));

        this.thermostatService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperature.bind(this));

        this.thermostatService
            .getCharacteristic(Characteristic.TargetTemperature)
            .on('get', this.getTargetTemperature.bind(this))
            .on('set', this.setTargetTemperature.bind(this));

        this.thermostatService
            .getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .on('get', this.getTemperatureDisplayUnits.bind(this))
            .on('set', this.setTemperatureDisplayUnits.bind(this));

        this.thermostatService
            .getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .on('get', this.getTargetTemperature.bind(this));

        this.thermostatService
            .getCharacteristic(Characteristic.Name)
            .on('get', this.getName.bind(this));

        return [informationService, this.thermostatService];
    }
}
