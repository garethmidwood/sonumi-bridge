var chai = require('chai'),
    expect = chai.expect,
    assert = chai.assert,
    should = chai.should,
    sinon  = require('sinon'),
    rewire = require('rewire'),
    chaiAsPromised = require('chai-as-promised'),
    bridgeClient = rewire("../lib/client"),
    bridgeServer = rewire("../lib/server"),
    deviceManager = require("../lib/device-manager"),
    device = require("../lib/device"),
    ioClient = require('socket.io-client'),
    EventEmitter = require('events').EventEmitter;

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
//loggerMock.log = function(msg) {
//    console.log(msg);
//};
loggerMock.error = sinon.stub();
loggerMock.addLogFile = sinon.stub();

var sonumiLoggerMock = sinon.stub();
sonumiLoggerMock.init = sinon.stub().returns(loggerMock);

var sonumiCommObsMock = sinon.stub();

var deviceManagerMock = sinon.stub();
deviceManagerMock.devicesCount = 0;
deviceManagerMock.removeDevice = function(item) {
    deviceManagerMock.devicesCount--;
};
deviceManagerMock.addDevice = function(item) {
    deviceManagerMock.devicesCount++;

    return { name: Math.random() };
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

new bridgeServer({
    devicemanager: deviceManagerMock
});

var sampleActionsResponse = JSON.stringify({
    "id": "id",
    "name": "Gareth",
    "actions": [
        { "path": "moo", "label": "make a moo" },
        { "path": "baa", "label": "make a baa" }
    ]
});

var mockSocket1 = {
    id: "device1",
    connected: true,
    on: sinon.stub(),
    emit: sinon.stub()
};
var mockSocket2 = {
    id: "device2",
    connected: true,
    on: sinon.stub(),
    emit: sinon.stub()
};
var mockSocket3 = {
    id: "device3",
    connected: true,
    on: sinon.stub(),
    emit: sinon.stub()
};



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

    it('should require an API client', function () {
        expect(
            function() {
                return new bridgeClient({
                    devicemanager: sinon.stub()
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



describe("Bridge Server - Device tracking", function() {
    var deviceClient;

    beforeEach(function(done) {
        deviceManagerMock.devicesCount = 0;

        deviceClient = ioClient.connect('http://localhost:3100/devices');

        deviceClient.on('connect_error', function(err) {
            throw new Error('Could not connect to the server!');
        });

        deviceClient.on('error', function(err) {
            throw new Error('Oh fudge!');
        });

        deviceClient.on('connect', function () {
            done();
        });
    });

    afterEach(function() {
        deviceClient.disconnect();
    });

    it('should add newly connected sockets to the device manager', function () {
        assert(1 == deviceManagerMock.devicesCount);
    });

    it('should remove the socket from the device manager when the client disconnects', function (done) {
        deviceManagerMock.removeDevice = function() {
            done();
        };

        deviceClient.disconnect();
    });
});




describe("Device Manager", function() {
    var clientMock;

    beforeEach(function() {
        clientMock = sinon.stub();
    });

    it('should create a new device from a connected socket', function () {
        var dependencies = { client: clientMock };

        var devMan = new deviceManager(dependencies);

        devMan.addDevice(mockSocket1);

        assert(Object.keys(devMan.devices).length == 1, "Adding first device");

        devMan.addDevice(mockSocket2);

        assert(Object.keys(devMan.devices).length == 2, "Adding second device");

        devMan.addDevice(mockSocket3);

        assert(Object.keys(devMan.devices).length == 3, "Adding third device");
    });

    it('should remove devices', function () {
        var dependencies = { client: clientMock };

        var devMan = new deviceManager(dependencies);

        var device = devMan.addDevice(mockSocket1);

        assert(Object.keys(devMan.devices).length == 1, "added a device");

        devMan.removeDevice(device);

        assert(Object.keys(devMan.devices).length == 0, "removed the device");
    });

    it('should fail silently if an unregistered device is removed', function () {
        var dependencies = { client: clientMock };

        var devMan = new deviceManager(dependencies);

        devMan.addDevice(mockSocket1);

        assert(Object.keys(devMan.devices).length == 1, "added a device");

        var mockDevice = sinon.stub();

        devMan.removeDevice(mockDevice);

        assert(Object.keys(devMan.devices).length == 1, "removed an unregistered device");
    });
});



describe("Device", function() {
    it('should be constructed with a connected socket', function () {
        var socket = { id: "device1", connected: false };
        var apiClient = sinon.stub();

        expect(function() {
            new device(apiClient, socket);
        }).to.throw('Device must be constructed with a connected socket');
    });

    it('should emit a "config" socket event to retrieve actions from the connected socket', function () {
        var socket = {
            id: "mocksocks",
            connected: true,
            on: sinon.stub(),
            emit: sinon.spy()
        };
        var apiClient = sinon.stub();

        new device(apiClient, socket);

        assert(socket.emit.calledWith('config'));
    });

    it('should trigger actions on the socket', function () {
        var socket = {
            id: "mocksocks",
            connected: true,
            on: sinon.stub(),
            emit: sinon.spy()
        };
        var apiClient = sinon.stub();

        var theDevice = new device(apiClient, socket);

        var myAction = 'awesomeaction';

        theDevice.trigger(myAction);

        assert(socket.emit.calledWith(myAction));
    });
});

