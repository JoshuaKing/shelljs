/* eslint no-extend-native: 0 */
var shell = require('shelljs');
var common = require('./src/common');
Object.keys(shell).forEach(function (cmd) {
  global[cmd] = shell[cmd];
});

require('./src/to')(String.prototype);
require('./src/toEnd')(String.prototype);
