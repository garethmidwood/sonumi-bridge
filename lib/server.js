var config = require('config');
var sonumiLogger = require('sonumi-logger');
var io = require('socket.io')();

var logger,
    deviceManager,
    SONUMI_PORT = 3100;

function BridgeServer(dependencies)
{
    if (!dependencies || !dependencies.devicemanager) {
        throw new Error('Device manager dependency is required');
    } else {
        deviceManager = dependencies.devicemanager;
    }

    if (dependencies.logger) {
        logger = dependencies.logger;
    } else {
        var logDirectory = config.logging.logDir;

        logger = sonumiLogger.init(logDirectory);
        logger.addLogFile('info', logDirectory + '/sonumi-server-info.log', 'info');
        logger.addLogFile('errors', logDirectory + '/sonumi-server-errors.log', 'error');
    }

    startServer();
}

function startServer()
{
    logger.log('starting server');

    try {
        var devices = io.of('/devices');

        devices.on('connection', function (socket) {
            logger.log('a device connected');

            var connectedDevice = deviceManager.addDevice(socket);

            socket.on('error', function (err) {
                logger.error(err.stack);
                deviceManager.removeDevice(connectedDevice);
            });

            socket.on('disconnect', function () {
                logger.log('a device disconnected');

                //console.log(io.engine.clientsCount + ' clients online');

                deviceManager.removeDevice(connectedDevice);
            });
        });

        io.listen(SONUMI_PORT);
    } catch (err) {
        logger.error(err);
        throw err;
    }
}

BridgeServer.prototype = {
    close: function () {
        logger.log('closing server on request');

        io.close();
    }
};

module.exports = BridgeServer;
