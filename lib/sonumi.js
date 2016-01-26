var config = require('config');
var sonumiLogger = require('sonumi-logger');
var sonumiClient = require('sonumi-client');
var sonumiCommandObserver = require('sonumi-command-observer');
var sonumiDeviceDetector = require('sonumi-device-detector');
var connectedDevice = require('./device');

var logger,
    client,
    commandObserver,
    deviceDetector,
    connectedDevices = [];

/*
    Write a commandHandler library
    Is there a way to ddpClient.registerObserver(commandHandler) ?
 */

/*
 var commandHandler = require('./observers/commands.js');
 var deviceDiscovery = require('./devices/discover.js');
 */
//var led = require('../commands/led.js');

function sonumi()
{
    initializeLogs();

    connect();

    //deviceDiscovery.setLogger(this.logs.device_discovery);
}

function initializeLogs() {
    var logDirectory = config.logging.logDir;

    logger = sonumiLogger.init(logDirectory);
    logger.addLogFile('info', logDirectory + '/info.log', 'info');
    logger.addLogFile('errors', logDirectory + '/errors.log', 'error');
}

function connect() {
    client = new sonumiClient();

    client.connect().then(
        function() {
            login();
        },
        function() {
            logger.error('could not connect, exiting');
            process.exit(1);
        }
    );
}

function login() {
    client.login().then(
        function() {
            subscribe();
        },
        function() {
            logger.error('could not log in, exiting');
            process.exit(1);
        }
    );
}

function subscribe() {
    // subscribe to the publication
    client.subscribe('pub_commands').then(
        function() {
            // watch for changes in the command collection and respond
            commandObserver = new sonumiCommandObserver(client);

            getConnectedDevices();
        },
        function() {
            logger.error('could not subscribe to commands, exiting');
            process.exit(1);
        }
    );

    // subscribe to the publication
    //client.subscribe('pub_commands').then(
    //    function() {
    //        // watch for changes in the command collection and respond
    //        commandObserver = new sonumiCommandObserver(client);
    //
    //        getConnectedDevices();
    //    },
    //    function() {
    //        logger.error('could not subscribe to commands, exiting');
    //        process.exit(1);
    //    }
    //);
}


function getConnectedDevices() {
    deviceDetector = new sonumiDeviceDetector();

    performScan();

    //commandObserver.register_handler(
    //    'led',
    //    {
    //        blink: function() {
    //            return new Promise(function(resolve, reject) {
    //                logger.log('blink blink');
    //
    //                setTimeout(
    //                    function(){
    //                        logger.log('done blinking');
    //                        resolve('COMPLETE');
    //                    },
    //                    3000
    //                );
    //            });
    //        }
    //    }
    //);
}

function performScan() {
    deviceDetector.scan().then(
        function() {
            updateConnectedDevices(deviceDetector.devices);
            setTimeout(performScan, 5*1000);
        },
        function() {
            logger.error('error detecting connected devices, exiting');
            process.exit(1);
        }
    );
}

function updateConnectedDevices(scanResults) {
    connectedDevices.forEach(function(device, index) {
        /* etc etc */
        scanResults = device.ingestScanResults(scanResults);

        /**
         * TODO: Update mongodb collection to indicate status of device
         */



        if (device.isDisconnected()) {
            /**
             * TODO: Remove action handlers
             */
            /**
             * TODO: Remove item from mongodb collection
             */
            logger.log('Lost connection to device ' + device.getName() + ', removing from collection');
            connectedDevices.splice(index, 1);
        }
    });

    addDiscoveredDevices(scanResults);
}

function addDiscoveredDevices(devices) {
    devices.forEach(function(ip) {
        var newDevice = new connectedDevice(ip);

        if (newDevice.isSonumiDevice()) {
            /**
             * TODO: Register action handlers
             */
            /**
             * TODO: Add item to mongodb collection
             */
            logger.log('New sonumi device detected @ ' + ip);
            connectedDevices.push(newDevice);
        }
    });
};

module.exports = sonumi;
