"use strict";

/* eslint-env node,mocha */
const net = require('net');
const expect = require('expect.js');

const Server = require('../server');
const Spawn  = require('../spawn');

const os = require('os');
const isWSL = os.platform() == "linux" && /microsoft/i.test(os.release());

describe("Simple distribution", function() {
  var port = -1;
  var server;
  var client;
  var spawn;


  this.timeout(10 * 1000);

  it("should start a server", function(done) {

    server = net.createServer(Server);

    server.listen(function() {
      port = this.address().port;
      console.log("Server is now ready");
      done();
    });
  });


  it("client should connect to the server", function(done) {
    client = net.connect(port, function() {
      console.log('Connected to', port);
      spawn = Spawn(client);
      done();
    });

  });



  it("should ask for a simple argv call", async () => {
    var child = spawn('node', ['-v'], {stdio : ['ignore', 'pipe', 'ignore']});

    var done = new Promise(resolve => child.once('exit', resolve));
    var body = new Promise(resolve => child.stdout.once('data', resolve));

    var version = String(await body).trim();
    var exit = await done;

    console.log("Got pid", child.pid);
    console.log('All done, version is %s , exit code is %d', version, exit);

    expect(exit).to.eql(0);
    expect(version).to.eql(process.version);
  });

  it("should fw stdin", async () => {
    if(isWSL) {
      console.log("Skipping stdin test");
      return;
    }

    var child = spawn('node', ['-e', "process.stdin.pipe(process.stdout)"]);
    var stderr = '';
    var stdout = '';
    child.stderr.on('data', line => stderr += line);
    child.stdout.on('data', line => stdout += line);

    child.stdin.end("BOUA");

    var done = new Promise(resolve => child.once('exit', resolve));
    var exit = await done;

    console.log('All done, exit code is %d', exit);

    expect(exit).to.eql(0);
    expect(stdout).to.eql("BOUA");
    expect(stderr).to.eql("");
  });

  it("should test kill", async () => {
    var child = spawn('node', ['-e', "setInterval(function(){}, 1000)"]);
    setTimeout(child.kill, 1000);

    var done = new Promise(resolve => child.once('exit', (...exit) => resolve(exit)));
    var exit = await done;

    console.log('All done, exit code is %d', exit);
    expect(exit).to.eql([null, 'SIGTERM']);
  });



  it("should test failure exit code", async () => {

    var child = spawn('node', ['-p', "process.exit(42)"]);

    var done = new Promise(resolve => child.once('exit', resolve));
    var exit = await done;

    console.log('All done, exit code is %d', exit);

    expect(exit).to.eql(42);
  });




  it("Should exit on server failure", async () => {

    var child = spawn('node');

    var done = new Promise(resolve => child.once('exit', resolve));

    setTimeout(function() {
      client.destroy();
      console.log("Should destroy client");
    }, 1000);
    var exit = await done;

    console.log('All done, exit code is %d', exit);

    expect(exit).to.eql(null);
  });







});




