var sonumiDevice = require('./device');
var sonumiCommandObserver = require('sonumi-command-observer');

function DeviceManager(dependencies)
{
    if (!dependencies || !dependencies.client) {
        throw new Error('API Client dependency is required');
    } else {
        this.apiClient = dependencies.client;
    }

    this.commands = new sonumiCommandObserver({
        devicemanager: this,
        client: this.apiClient
    });

    this.devices = [];
}

DeviceManager.prototype = {
    commandObserver: null,
    addDevice: function(socket) {
        var device = new sonumiDevice(this.apiClient, socket, this);

        this.devices.push(device);

        return device;
    },
    removeDevice: function(device) {
        var index = this.devices.indexOf(device);

        if (index > -1) {
            this.devices.splice(index, 1);
        }
    },

    // TODO: Maybe.. move these command status updates elsewhere
    // perhaps we should be passing the observer to the new device,
    // not the device manager?

    actionComplete: function(actionId) {
        this.commands.status_complete(actionId);
    },
    actionExecuting: function(actionId) {
        this.commands.status_executing(actionId);
    },
    actionFailed: function(actionId) {
        this.commands.status_fail(actionId);
    },
    trigger: function(_id, command) {
        // acknowledge receipt of command
        this.commands.status_ack(_id);

        var handlerFound = false;

        this.devices.forEach(function(device) {
            device.actions.forEach(function(action) {
                if (command.actionId === action.id) {
                    device.trigger(_id, action);
                    handlerFound = true;
                }
            });
        });

        if (!handlerFound) {
            this.commands.status_fail(_id);
        }
    }
};

module.exports = DeviceManager;