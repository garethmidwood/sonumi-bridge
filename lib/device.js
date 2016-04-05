function Device(apiClient, socket, deviceManager)
{
    if (socket.connected && socket.id) {
        this.socket = socket;
    } else {
        throw new TypeError('Device must be constructed with a connected socket');
    }

    this.apiClient = apiClient;

    var self = this;

    this.socket.on('device-config', function (data) {
        if (
            !data
            || !data.hasOwnProperty('id')
            || !data.hasOwnProperty('name')
            || !data.hasOwnProperty('actions')
        ) {
            // send message and then disconnect the socket
            this.send('missing configuration properties');
            this.disconnect();
            return;
        }

        self.id = data.id;
        self.name = data.name;
        self.actions = data.actions;

        self.actions.forEach(function (action) {
            self.apiClient.call(
                'addDeviceAction',
                [self.id, self.name, action.label],
                function (err, actionId) {
                    action.id = actionId;

                    if (err) {
                        console.error(
                            'Error adding action ' + action.label + ' message: ' + JSON.stringify(err)
                        );
                    }
                }
            );
        });
    });

    this.socket.on('disconnect', function() {
        self.apiClient.call(
            'removeDeviceAction',
            [self.id],
            function (err, actionId) {
                if (err) {
                    console.error(
                        'Error removing device. Message: ' + JSON.stringify(err)
                    );
                }
            }
        );
    });

    this.socket.on('action_complete', function(actionId) {
        //console.log('Completing action with ID ' + actionId);
        deviceManager.actionComplete(actionId);
    });

    this.socket.on('action_executing', function(actionId) {
        //console.log('Action with ID ' + actionId + ' is already executing');
        deviceManager.actionExecuting(actionId);
    });

    this.socket.on('action_failed', function(actionId) {
        //console.log('Action with ID ' + actionId + ' has failed');
        deviceManager.actionFailed(actionId);
    });



    this.socket.emit('config');
}

Device.prototype = {
    id: null,
    name: null,
    actions: null,
    trigger: function(_id, action) {
        //console.log('Triggering action with ID ' + _id);
        this.socket.emit(action.label, _id);
    }
};

module.exports = Device;
