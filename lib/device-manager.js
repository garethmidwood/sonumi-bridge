var devices = [],
    apiClient;

function DeviceManager(sonumiApiClient) {
    apiClient = sonumiApiClient;
}

DeviceManager.prototype = {
    addDevice: function(device) {
        console.log('adding a device');

        devices.push(device);
    },
    removeDevice: function(device) {
        console.log('removing a device');

        var index = devices.indexOf(device);

        devices.splice(index, 1);
    },
    subscribe: function(subscription) {
        apiClient.subscribe(subscription);
    }
};

module.exports = DeviceManager;