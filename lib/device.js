function Device(ipAddress)
{
    this.ip = ipAddress;
}

Device.prototype = {
    ip: null,
    failedPings: 0,
    status: 'OK',
    isSonumiDevice: function() {
        /**
         * TODO: Should connect to the device and retrieve its json
         */

        return true;
    },
    getName: function() {
        /**
         * TODO: This should come from the devices json
         */
        return 'GEOFF' + this.ip;
    },
    getActions: function() {

    },
    getStatus: function() {
        return this.status;
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
    }
};

module.exports = Device;