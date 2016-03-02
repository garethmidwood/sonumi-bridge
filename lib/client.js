var config = require('config');
var sonumiLogger = require('sonumi-logger');
var sonumiCommandObserver = require('sonumi-command-observer');

var logger,
    apiClient,
    deviceManager;

function BridgeClient(dependencies)
{
    if (!dependencies || !dependencies.devicemanager) {
        throw new Error('Device manager dependency is required');
    } else if (!dependencies.client) {
        throw new Error('API client dependency is required');
    } else {
        deviceManager = dependencies.devicemanager;
        apiClient = dependencies.client;
    }

    if (dependencies.logger) {
        logger = dependencies.logger;
    } else {
        var logDirectory = config.logging.logDir;

        logger = sonumiLogger.init(logDirectory);
        logger.addLogFile('info', logDirectory + '/sonumi-client-info.log', 'info');
        logger.addLogFile('errors', logDirectory + '/sonumi-client-errors.log', 'error');
    }
}

function connect()
{
    return apiClient.connect(connect)
        .then(function() {
            logger.log('connected, attempting log in');
            return apiClient.login();
        })
        .then(function() {
            logger.log('logged in, attempting subscription');
            return apiClient.subscribe('pub_commands');
        })
        .then(function() {
            logger.log('subscribed, starting observing commands');
            return new sonumiCommandObserver(apiClient);
        })
        .catch(function(err) {
            logger.error('could not connect, exiting');
            logger.error(err);
            throw new Error('API Client failed to connect, login or subscribe to commands');
        });
}

BridgeClient.prototype = {
    init: function () {
        return connect();
    }
};

module.exports = BridgeClient;
