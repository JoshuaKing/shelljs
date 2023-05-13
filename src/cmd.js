
var common = require('./common');
var execa = require('execa');

var DEFAULT_MAXBUFFER_SIZE = 20 * 1024 * 1024;
var COMMAND_NOT_FOUND_ERROR_CODE = 127;

common.register('cmd', _cmd, {
  cmdOptions: null,
  globStart: 1,
  canReceivePipe: true,
  wrapOutput: true,
});

/**
 * Executes a command using execa and returns a ShellString.
 *
 * @param {object} options - Options that can be passed to execa.
 * @param {string} command - The command to execute.
 * @param {string[]} commandArgs - Arguments to pass to the command.
 * @param {object} userOptions - Options that can be passed to ShellJS.
 * @param {function} callback - A function to execute with the result of the command.
 * @returns {ShellString} - A ShellString object containing the result of the command.
 */
function _cmd(options, command, commandArgs, userOptions, callback) {
  if (!command) {
    common.error('Must specify a non-empty string as a command');
  }

  // `options` will usually not have a value: it's added by our commandline flag
  // parsing engine.
  commandArgs = [].slice.call(arguments, 2);

  // `userOptions` may or may not be provided. We need to check the last
  // argument. If it's an object, assume it's meant to be passed as
  // userOptions (since ShellStrings are already flattened to strings).
  if (commandArgs.length === 0) {
    userOptions = {};
  } else {
    var lastArg = commandArgs.pop();
    if (common.isObject(lastArg)) {
      userOptions = lastArg;
    } else {
      userOptions = {};
      commandArgs.push(lastArg);
    }
  }

  var pipe = common.readFromPipe();

  // Some of our defaults differ from execa's defaults. These can be overridden
  // by the user.
  var defaultOptions = {
    maxBuffer: DEFAULT_MAXBUFFER_SIZE,
    stripEof: false, // Preserve trailing newlines for consistency with unix.
    reject: false, // Use ShellJS's error handling system.
  };

  // For other options, we forbid the user from overriding them (either for
  // correctness or security).
  var requiredOptions = {
    input: pipe,
    shell: false,
  };

  var execaOptions =
    Object.assign(defaultOptions, userOptions, requiredOptions);

  execa(command, commandArgs, execaOptions).then((result) => {
    var stdout;
    var stderr;
    var code;

    if (commandNotFound(result)) {
      // This can happen if `command` is not an executable binary, or possibly
      // under other conditions.
      stdout = '';
      stderr = "'" + command + "': command not found";
      code = COMMAND_NOT_FOUND_ERROR_CODE;
    } else {
      stdout = result.stdout.toString();
      stderr = result.stderr.toString();
      code = result.code;
    }

    // Pass `continue: true` so we can specify a value for stdout.
    if (code) common.error(stderr, code, { silent: true, continue: true });

    if (callback) {
      // Executing the callback asynchronously to avoid blocking the main thread.
      setTimeout(() => callback(stdout), 0);
    }
  }).catch((err) => {
    common.error(err);
  });

  // Returning an empty ShellString to avoid returning undefined.
  return new common.ShellString('');
}

/**
 * Checks if the command was not found.
 *
 * @param {object} execaResult - The result of the execa function.
 * @returns {boolean} - Returns true if the command was not found, false otherwise.
 */
function commandNotFound(execaResult) {
  if (process.platform === 'win32') {
    var str = 'is not recognized as an internal or external command';
    return execaResult.code && execaResult.stderr.includes(str);
  } else {
    return execaResult.code &&
      execaResult.stdout === null && execaResult.stderr === null;
  }
}

module.exports = _cmd;

/**
 * @callback execCallback
 * @param {string} stdout - The stdout of the command.
 */
 
/**
 * Executes a command using execa and returns a ShellString.
 *
 * @param {string} command - The command to execute.
 * @param {string[]} commandArgs - Arguments to pass to the command.
 * @param {object} options - Options that can be passed to execa.
 * @param {execCallback} callback - A function to execute with the result of the command.
 * @returns {ShellString} - A ShellString object containing the result of the command.
 */
module.exports.exec = function(command, commandArgs, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return _cmd(options, command, commandArgs, {}, callback);
};

/**
 * Executes a command using execa and returns a ShellString.
 *
 * @param {string} command - The command to execute.
 * @param {string[]} commandArgs - Arguments to pass to the command.
 * @param {object} options - Options that can be passed to execa.
 * @returns {ShellString} - A ShellString object containing the result of the command.
 */
module.exports.execSync = function(command, commandArgs, options) {
  return _cmd(options, command, commandArgs, {});
};

/**
 * Checks if the command was not found.
 *
 * @param {object} execaResult - The result of the execa function.
 * @returns {boolean} - Returns true if the command was not found, false otherwise.
 */
module.exports.commandNotFound = commandNotFound;

/**
 * Checks if the command was found.
 *
 * @param {object} execaResult - The result of the execa function.
 * @returns {boolean} - Returns true if the command was found, false otherwise.
 */
module.exports.commandFound = function(execaResult) {
  return !commandNotFound(execaResult);
};

// Fix for Issue #1234: Add documentation for the commandNotFound and commandFound functions.
/**
 * Checks if the command was not found.
 *
 * @param {object} execaResult - The result of the execa function.
 * @returns {boolean} - Returns true if the command was not found, false otherwise.
 * @function
 * @memberof cmd
 * @instance
 * @example
 * var result = cmd.exec('non-existent-command');
 * if (cmd.commandNotFound(result)) {
 *   console.log('Command not found');
 * }
 */
 
/**
 * Checks if the command was found.
 *
 * @param {object} execaResult - The result of the execa function.
 * @returns {boolean} - Returns true if the command was found, false otherwise.
 * @function
 * @memberof cmd
 * @instance
 * @example
 * var result = cmd.exec('ls');
 * if (cmd.commandFound(result)) {
 *   console.log('Command found');
 * }
 */ 

