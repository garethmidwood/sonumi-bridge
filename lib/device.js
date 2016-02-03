var request = require('request');

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
    status: 'OK',
    isSonumiDevice: function() {
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
    isDisconnected: function() {
        return this.status === 'DISCONNECTED';
    },
    isOK: function() {
        return this.status === 'OK';
    },
    isWarning: function() {
        return this.status === 'WARNING';
    },
    ingestScanResults: function(connectedDevices) {
        var index = connectedDevices.indexOf(this.ip);

        // remove item from array
        if (index >= 0) {
            connectedDevices.splice(index, 1);
        }

        this.updateStatus(index);

        return connectedDevices;
    },
    updateStatus: function(searchIndex) {
        if (searchIndex < 0) {
            // failed ping
            this.failedPings++;
        } else {
            this.failedPings = 0;
        }

        switch(this.failedPings) {
            case 0:
            case 1:
                this.status = 'OK';
                break;
            case 2:
            case 3:
                this.status = 'WARNING';
                break;
            default:
                this.status = 'DISCONNECTED';
                break;
        }
    },
    trigger: function(action) {
        var requestUrl = 'http://' + this.ip + ':' + this.port + action.path;

        return new Promise(function(resolve, reject) {
            request(requestUrl, function (error, response, body) {
                console.log(response.statusCode);

                if (!error && response.statusCode == 200) {
                    resolve('COMPLETE');
                    return;
                }

                reject('FAIL');
            });
        });
    }
};

module.exports = Device;