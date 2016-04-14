var app    = require('./lib/sonumi');
var sonumiLogger = require('sonumi-logger');
var config = require('config');

var logDirectory = config.logging.logDir;

logger = sonumiLogger.init(logDirectory);
logger.addLogFile('info', logDirectory + '/sonumi-bridge-info.log', 'info');
logger.addLogFile('errors', logDirectory + '/sonumi-bridge-errors.log', 'error');

try {
    // off we go
    app();
} catch (err) {
    logger.error('Failed! Error!');
    logger.error(err);
    process.exit(1);
}
