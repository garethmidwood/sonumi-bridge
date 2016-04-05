var bridgeServer = require('./server');
var deviceManager = require('./device-manager');
var sonumiClient = require('sonumi-client');


function sonumi()
{
    var apiClient = new sonumiClient();

    apiClient.connect()
        .then(function() {
            return apiClient.login();
        })
        .then(function() {
            var devMan = new deviceManager({
                client: apiClient
            });

            var server = new bridgeServer({
                devicemanager: devMan,
                client: apiClient
            });
        })
        .catch(function(err) {
            throw new Error('API Client failed to connect, login or subscribe to commands');
        });
}

module.exports = sonumi;
