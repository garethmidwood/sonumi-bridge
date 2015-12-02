var config          = require('config');
var ddpClient       = require('ddp');
var login           = require('ddp-login');
var sonumiLogger    = require('sonumi-logger');


var logger, client;

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
    var logDirectory = config.logging.logDir;

    logger = new sonumiLogger(logDirectory);
    logger.addLogFile('info', logDirectory + '/info.log', 'info');
    logger.addLogFile('errors', logDirectory + '/errors.log', 'error');

    connect();
    //deviceDiscovery.setLogger(this.logs.device_discovery);
}



function connectionCallback(error)
{
    if (error) {
        logger.error('connection error: ' + error.message);
        return;
    }

    logger.log('connected! attempting to login');

    login(
        client,
        {
            env: 'METEOR_TOKEN',
            method: 'email',
            account: config.server.user,
            pass: config.server.pass,
            retry: 5,
            plaintext: false
        },
        function (error, userInfo) {
            if (error) {
                logger.error('error logging in: ' +  error);
            } else {
                // We are now logged in, with userInfo.token as our session auth token.
                logger.log('logged in successfully.');
                logger.log('token: ' + userInfo.token);
            }
        }
    );

    // subscribe to commands
    client.subscribe('pub_commands', [], function () {
        logger.log('commands subscription complete');
    });
/*
    // start observing commands
    var commandHandler = new commandHandler(client);

    commandHandler.register_handler('led', new led(this));
*/
}



function connect()
{
    client = new ddpClient({
        host : config.host,
        port : config.port
    });

    logger.log('attempting connection');

    /*
     * Connect to the Meteor Server
     */
    client.connect(connectionCallback);

    client.on('socket-close', function(code, message) {
        logger.log('Connection closed with code: ' + code + ' and message: ' + message);
    });

    client.on('socket-error', function(error) {
        logger.error('Socket error: ' + error);
    });
}

module.exports = sonumi;
