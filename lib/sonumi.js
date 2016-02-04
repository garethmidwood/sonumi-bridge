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
    connectedDevices = [],
    scanner;

const SONUMI_PORT = 3100;

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

    client.connect(reconnect).then(
        function() {
            login();
        },
        function() {
            logger.error('could not connect, exiting');
            process.exit(1);
        }
    );
}

function reconnect() {
    client.connect(reconnect).then(
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
}


function getConnectedDevices() {
    connectedDevices = [];

    deviceDetector = new sonumiDeviceDetector();

    performScan();
}

function performScan() {
    clearTimeout(scanner);

    if (!client.connected) {
        logger.error('cancelling network scan, disconnected');
        return;
    }

    deviceDetector.scan().then(
        function() {
            updateConnectedDevices(deviceDetector.devices);
            scanner = setTimeout(performScan, 5*1000);
        },
        function() {
            logger.error('error detecting connected devices, exiting');
            process.exit(1);
        }
    );
}

function updateConnectedDevices(scanResults) {
    var promises = [];

    for (var index = connectedDevices.length - 1; index >= 0; index--) {
        var device = connectedDevices[index];

        // find out if it's still connected
        var devicePromise = device.ping();

        promises.push(devicePromise);

        devicePromise.then(
            function() {
                device.isOnline(true);
            },
            function() {
                device.isOnline(false);

                if (device.isDisconnected()) {
                    client.call(
                        'removeDeviceAction',
                        [device.id],
                        function (err, result) {
                            if (err) {
                                logger.error(
                                    'Error removing device ' + device.name + ' message: ' + JSON.stringify(err)
                                );
                            } else {
                                logger.log('removed devices successfully');
                            }
                        }
                    );

                    logger.log('Lost connection to device ' + device.name + ', taking it offline');
                    connectedDevices.splice(index, 1);
                }
            }
        );

        // remove device from scan results
        var deviceIndexInScanResults = scanResults.indexOf(device.ip);

        if (deviceIndexInScanResults >= 0) {
            scanResults.splice(deviceIndexInScanResults, 1);
        }
    }

    if (promises.length == 0) {
        addDiscoveredDevices(scanResults);
    } else {
        Promise.all(promises).then(function () {
            addDiscoveredDevices(scanResults);
        });
    }
}

function addDiscoveredDevices(devices) {
    devices.forEach(function(ip) {
        var newDevice = new connectedDevice(ip, SONUMI_PORT);

        newDevice.isSonumiDevice().then(function() {
            /**
             * TODO: Register device
             */
            var identifier = newDevice.id;
            var deviceName = newDevice.name;
            /**
             * TODO: Register action handlers
             */
            var actions = newDevice.actions;

            actions.forEach(function(action) {
                client.call(
                    'addDeviceAction',
                    [identifier, deviceName, action.label],
                    function (err, actionId) {
                        if (err) {
                            logger.error(
                                'Error adding action ' + action.label + ' message: ' + JSON.stringify(err)
                            );
                        } else {
                            commandObserver.register_handler(
                                actionId,
                                function() {
                                    return newDevice.trigger(action);
                                }
                            );
                        }
                    }
                );
            });

            /**
             * TODO: Add item to mongodb collection
             */
            logger.log('New sonumi device detected ' + newDevice.name + ' @ ' + newDevice.ip);
            connectedDevices.push(newDevice);
        });
    });
};

module.exports = sonumi;
