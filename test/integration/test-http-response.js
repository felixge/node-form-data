var common = require('../common');
var assert = common.assert;
var http = require('http');
var path = require('path');
var mime = require('mime-types');
var parseUrl = require('url').parse;
var FormData = require(common.dir.lib + '/form_data');
var IncomingForm = require('formidable').IncomingForm;

// static server prepared for all tests
var remoteFile = 'http://localhost:' + common.staticPort + '/unicycle.jpg';

var FIELDS;
var server;

var parsedUrl = parseUrl(remoteFile);
var options = {
  method: 'get',
  port: parsedUrl.port || 80,
  path: parsedUrl.pathname,
  host: parsedUrl.hostname
};

// request static file
http.request(options, function(response) {

  FIELDS = [
    {name: 'my_field', value: 'my_value'},
    {name: 'my_buffer', value: new Buffer([1, 2, 3])},
    {name: 'remote_file', value: response }
  ];

  var form = new FormData();
  FIELDS.forEach(function(field) {
    form.append(field.name, field.value);
  });

  server.listen(common.port, function() {
    common.actions.submit(form, server);
  });

}).end();

// prepare form-receiving http server
server = http.createServer(function(req, res) {

  var form = new IncomingForm({uploadDir: common.dir.tmp});

  form.parse(req);

  form
    .on('field', function(name, value) {
      var field = FIELDS.shift();
      assert.strictEqual(name, field.name);
      assert.strictEqual(value, field.value + '');
    })
    .on('file', function(name, file) {
      var field = FIELDS.shift();
      assert.strictEqual(name, field.name);
      // http response doesn't have path property
      assert.strictEqual(file.name, path.basename(field.value.path || remoteFile));
      assert.strictEqual(file.type, mime.lookup(file.name));
    })
    .on('end', common.actions.formOnEnd.bind(null, res));
});


process.on('exit', function() {
  assert.strictEqual(FIELDS.length, 0);
});
