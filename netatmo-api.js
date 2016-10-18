'use strict';
var request = require('request');
var simpleoauth2 = require('simple-oauth2');

class NetatmoAPI {
    constructor(clientid, clientsecret) {
        const credentials = {
            client: {
                id: clientid,
                secret: clientsecret,
            },
            auth: {
                tokenHost: 'https://api.netatmo.com/',
                tokenPath: '/oauth2/token'
            },
            http: { headers: { 'User-Agent': 'homebridge-thermostat-netatmo' } }
        };

        this._oauth2 = simpleoauth2.create(credentials);
    }

    authenticate(username, password) {
        var tokenConfig = {
            username: username,
            password: password,
            scope: 'read_thermostat write_thermostat'
        };

        var promise = this._oauth2.ownerPassword
            .getToken(tokenConfig)
            .then((result) => {
                const token = this._oauth2.accessToken.create(result);
                return token;
            });

        return promise;
    }

    getThermostatState(token) {
        var deffered = new Promise((resolve, reject) => {
            request({
                url: 'https://api.netatmo.com/api/getthermostatsdata',
                qs: {'access_token': token.token.access_token}
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var processedData = NetatmoAPI.procesData(body);
                    if (!processedData) {
                        reject('No data found.');
                        return;
                    }

                    resolve(processedData);
                    return;
                } else {
                    if (!error && body) {
                        error = body;
                    }
                    var errorstr = 'Error getting thermostat state (status code '+response.statusCode+'): ' + error;
                    reject(errorstr);
                    return;
                }
            });
        });

        return deffered;
    }

    setThermostat(data) {
        var deffered = new Promise((resolve, reject) => {

            request({
                url: 'https://api.netatmo.com/api/setthermpoint',
                qs: {
                    'access_token': data['token'].token.access_token,
                    'device_id': data['device_id'],
                    'module_id': data['module_id'],
                    'setpoint_temp': data['temperature'],
                    'setpoint_mode': data['mode'],
                }
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var processedData = NetatmoAPI.processAPIResponse(body);
                    if (!processedData) {
                        reject('Setting thermostate state failed (invalid response)');
                        return;
                    }

                    resolve(processedData);
                    return;
                } else {
                    if (!error && body) {
                        error = body;
                    }
                    var errorstr = 'Setting thermostate state failed (status code '+response.statusCode+'): ' + error;
                    reject(errorstr);
                    return;
                }

            });
        });

        return deffered;
    }

    static processAPIResponse(text) {
        var data = JSON.parse(text);
        if (data.status !== 'ok') {
            return null;
        }
        return data;
    }

    static procesData(text) {
        var data = this.processAPIResponse(text);
        if (!data) {
            return null;
        }
        var device = data.body.devices[0];
        var thermostat = device.modules[0];
        var result = {
            device_id: device._id,
            module_id: thermostat._id,
            temperature: thermostat.measured.temperature,
            heatingOn: (thermostat.therm_relay_cmd !== 0),
            setPoint: thermostat.measured.setpoint_temp,
            mode: thermostat.setpoint.setpoint_mode,
        };

        return result;
    }
}

module.exports = NetatmoAPI;
