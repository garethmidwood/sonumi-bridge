function Device(socket)
{
    if (socket.connected && socket.id) {
        this.socket = socket;
    } else {
        throw new TypeError('Device must be constructed with a connected socket');
    }

    var self = this;

    this.socket.on('device-actions', function (data) {
        self.setActions(data);
    });
}

Device.prototype = {
    id: null,
    setActions: function(data) {
        console.log('setting actions from data');
    },
    trigger: function(action) {
        //var requestUrl = 'http://' + this.ip + ':' + this.port + action.path;
        //
        //return new Promise(function(resolve, reject) {
        //    request(requestUrl, function (error, response, body) {
        //        if (error) {
        //            reject('FAIL');
        //            return;
        //        }
        //
        //        switch (response.statusCode) {
        //            case 200:
        //                resolve('COMPLETE');
        //                break;
        //            case 102:
        //                resolve('EXECUTING');
        //                break;
        //            default:
        //                reject('FAIL');
        //        }
        //    });
        //});

        this.socket.emit(action);
    }
};

module.exports = Device;
