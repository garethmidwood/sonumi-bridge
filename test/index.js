var chai = require('chai'),
    expect = chai.expect,
    assert = chai.assert,
    should = chai.should,
    sinon  = require('sinon'),
    rewire = require('rewire'),
    chaiAsPromised = require('chai-as-promised'),
    bridgeClient = rewire("../lib/client"),
    bridgeServer = rewire("../lib/server"),
    ioClient = require('socket.io-client');

chai.use(chaiAsPromised);

var configMock = {
    "server": {
        "host": "testhost",
        "port": "3000",
        "user": "test@example.com",
        "pass": "password"
    },
    "logging": {
        "logDir": "/tmp/"
    }
};

var loggerMock = sinon.stub();
loggerMock.log = sinon.stub();
loggerMock.error = sinon.stub();
loggerMock.addLogFile = sinon.stub();

var sonumiLoggerMock = sinon.stub();
sonumiLoggerMock.init = sinon.stub().returns(loggerMock);

var sonumiCommObsMock = sinon.stub();

var deviceManagerMock = sinon.stub();
deviceManagerMock.devicesCount = 0;
deviceManagerMock.removeDevices = function(socket) {
    deviceManagerMock.devicesCount = 0;
};
deviceManagerMock.removeDevice = function(item) {
    deviceManagerMock.devicesCount--;
};
deviceManagerMock.addDevice = function(item) {
    deviceManagerMock.devicesCount++;
};

bridgeServer.__set__({
    config: configMock,
    sonumiLogger: sonumiLoggerMock
});

bridgeClient.__set__({
    config: configMock,
    sonumiLogger: sonumiLoggerMock,
    sonumiCommandObserver: sonumiCommObsMock
});

var activeBridgeServer = new bridgeServer({
    devicemanager: deviceManagerMock
});




describe("Bridge Client", function() {
    var deviceManagerMock,
        clientMock,
        client;

    beforeEach(function() {
        clientMock = sinon.stub();
        deviceManagerMock = sinon.stub();
    });

    it('should require a device manager', function () {
        expect(
            function() {
                return new bridgeClient({
                    client: sinon.stub()
                })
            }
        ).to.throw(Error);
    });

    it('should connect to the API server', function () {
        clientMock.connect = sinon.stub().returns(Promise.resolve('connected'));
        clientMock.login = sinon.stub().returns(Promise.resolve('logged in'));
        clientMock.subscribe = sinon.stub().returns(Promise.resolve('subscribed'));

        client = new bridgeClient({
            devicemanager: deviceManagerMock,
            client: clientMock
        });

        return client.init().then(function(response){
            assert(clientMock.connect.calledOnce);
            assert(clientMock.login.calledOnce);
            assert(clientMock.subscribe.calledOnce);
        });
    });

    it('should throw an error if it fails to connect to the API server', function () {
        clientMock.connect = sinon.stub().returns(Promise.reject('connection failed'));

        client = new bridgeClient({
            devicemanager: deviceManagerMock,
            client: clientMock
        });

        return assert.isRejected(client.init());
    });

    it('should throw an error if it fails to login to the API server', function () {
        clientMock.connect = sinon.stub().returns(Promise.resolve('connected'));
        clientMock.login = sinon.stub().returns(Promise.reject('failed log in'));

        client = new bridgeClient({
            devicemanager: deviceManagerMock,
            client: clientMock
        });

        return assert.isRejected(client.init());
    });

    it('should throw an error if it fails to subscribe to a publication', function () {
        clientMock.connect = sinon.stub().returns(Promise.resolve('connected'));
        clientMock.login = sinon.stub().returns(Promise.resolve('logged in'));
        clientMock.subscribe = sinon.stub().returns(Promise.reject('subscription failed'));

        client = new bridgeClient({
            devicemanager: deviceManagerMock,
            client: clientMock
        });

        return assert.isRejected(client.init());
    });
});



describe("Bridge Server", function() {
    var toRevert = [];

    it('should require a device manager', function () {
        expect(
            function() {
                return new bridgeServer({
                    client: sinon.stub()
                })
            }
        ).to.throw(Error);
    });

    it('should automatically start listening for connections on the given port', function () {
        var socketServerNamespaceMock = sinon.stub();
        var socketServerMock = sinon.stub();

        socketServerNamespaceMock.on = sinon.stub();
        socketServerMock.of = sinon.stub().returns(socketServerNamespaceMock);
        socketServerMock.listen = sinon.stub();

        bridgeServer.__with__({
            SONUMI_PORT: 1234,
            io: socketServerMock
        })(function () {
            new bridgeServer({
                devicemanager: deviceManagerMock,
                client: sinon.stub()
            });

            assert(socketServerMock.listen.calledWith(1234));
        });
    });
});



describe("Bridge Server client methods", function() {
    var deviceClient;

    beforeEach(function(done) {
        deviceClient = ioClient.connect('http://localhost:3100/devices');

        deviceClient.on('connect', function () {
            done();
        });

        deviceClient.on('connect_error', function(err) {
            throw new Error('Could not connect to the server!');
        });

        deviceClient.on('error', function(err) {
            throw new Error('Oh fudge!');
        });
    });

    afterEach(function() {
        deviceClient.disconnect();
    });

    it('should add new devices to the device manager', function (done) {
        var initialDeviceCount = deviceManagerMock.devicesCount;

        var deviceJson = JSON.stringify({"bar" : "baz"});

        deviceClient.emit('new-device', deviceJson, function() {
            assert((initialDeviceCount+1) == deviceManagerMock.devicesCount);
            done();
        });
    });

    it('should remove a device when it disconnects', function (done) {
        var initialDeviceCount = deviceManagerMock.devicesCount;

        var deviceJson = JSON.stringify({"bar" : "baz"});

        deviceClient.emit('detach', deviceJson, function() {
            assert((initialDeviceCount-1) == deviceManagerMock.devicesCount);
            done();
        });
    });

    it('should not try to add invalid devices', function (done) {
        var initialDeviceCount = deviceManagerMock.devicesCount;

        var brokenDeviceJson = '[not: valid]';

        deviceClient.emit('new-device', brokenDeviceJson, function(Error) {
            assert(initialDeviceCount == deviceManagerMock.devicesCount);
            done();
        });
    });

    it('should not remove a device when the supplied device doesn\'t exist', function (done) {
        var initialDeviceCount = deviceManagerMock.devicesCount;

        var brokenDeviceJson = '[not: valid]';

        deviceClient.emit('detach', brokenDeviceJson, function(Error) {
            assert(initialDeviceCount == deviceManagerMock.devicesCount);
            done();
        });
    });

    it('should remove all devices when the client disconnects', function (done) {
        deviceClient.on('disconnect', function(err) {
            setTimeout(function() {
                assert(0 == deviceManagerMock.devicesCount);
                done();
            }, 1000);
        });

        var deviceJson = JSON.stringify({"bar" : "baz"});

        deviceClient.emit('new-device', deviceJson, function() {
            deviceClient.disconnect();
        });
    });
});


