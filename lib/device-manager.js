var sonumiDevice = require('./device');

function DeviceManager(dependencies)
{
    if (!dependencies || !dependencies.client) {
        throw new Error('API Client dependency is required');
    } else {
        this.apiClient = dependencies.client;
    }

    this.devices = [];
}

DeviceManager.prototype = {
    addDevice: function(socket) {
        var device = new sonumiDevice(socket);

        this.devices.push(device);

        return device;
    },
    removeDevice: function(device) {
        var index = this.devices.indexOf(device);

        if (index > -1) {
            this.devices.splice(index, 1);
        }
    },
    subscribe: function(subscription) {
        this.apiClient.subscribe(subscription);
    }
};

module.exports = DeviceManager;