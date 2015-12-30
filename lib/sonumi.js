var config          = require('config');
var sonumiLogger    = require('sonumi-logger');
var sonumiConnector = require('sonumi-connector');
var sonumiCommandObserver = require('sonumi-command-observer');


var logger, client, commandObserver;

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
    client = new sonumiConnector();

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
            observe();
            subscribe();
        },
        function() {
            logger.error('could not log in, exiting');
            process.exit(1);
        }
    );
}

function observe() {
    commandObserver = new sonumiCommandObserver(client);
}

function subscribe() {
    // subscribe to the publication
    client.subscribe('pub_commands').then(
        function() {
            /*
            commandObserver = new sonumiCommandObserver(client);

            commandObserver.register_handler('led', {});
            */

            //client.observe('pub_commands');
            console.log('done subscribing');
        },
        function() {
            logger.error('could not subscribe to commands, exiting');
            process.exit(1);
        }
    );

    // add observers
    // new commandObserver(ddpclient, logs.observer_commands);
}

module.exports = sonumi;
