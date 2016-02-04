var request = require('request');

const STATUS_OK = 'OK';
const STATUS_DISCONNECTED = 'DISCONNECTED';
const STATUS_WARNING = 'WARNING';

function Device(ipAddress, portNumber)
{
    this.ip = ipAddress;
    this.port = portNumber;
}

Device.prototype = {
    id: null,
    ip: null,
    port: null,
    name: null,
    actions: null,
    failedPings: 0,
    status: STATUS_OK,
    isSonumiDevice: function() {
        return this.ping();
    },
    isDisconnected: function() {
        return this.status === STATUS_DISCONNECTED;
    },
    isOK: function() {
        return this.status === STATUS_OK;
    },
    isWarning: function() {
        return this.status === STATUS_WARNING;
    },
    ping: function() {
        var requestUrl = 'http://' + this.ip + ':' + this.port + '/sonumi';

        var self = this;

        return new Promise(function(resolve, reject) {
            request(requestUrl, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var json = JSON.parse(body);

                    self.id = json.id;
                    self.name = json.name;
                    self.actions = json.actions;

                    resolve();
                }

                reject();
            });
        });
    },
    isOnline: function(isOnline) {
        if (isOnline) {
            this.failedPings = 0;
        } else {
            this.failedPings++;
        }

        this.updateStatus();
    },
    updateStatus: function() {
        switch(this.failedPings) {
            case 0:
            case 1:
                this.status = STATUS_OK;
                break;
            case 2:
            case 3:
                this.status = STATUS_WARNING;
                break;
            default:
                this.status = STATUS_DISCONNECTED;
                break;
        }
    },
    trigger: function(action) {
        var requestUrl = 'http://' + this.ip + ':' + this.port + action.path;

        return new Promise(function(resolve, reject) {
            request(requestUrl, function (error, response, body) {
                if (error) {
                    reject('FAIL');
                    return;
                }

                switch (response.statusCode) {
                    case 200:
                        resolve('COMPLETE');
                        break;
                    case 102:
                        resolve('EXECUTING');
                        break;
                    default:
                        reject('FAIL');
                }
            });
        });
    }
};

module.exports = Device;