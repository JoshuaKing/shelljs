if (require.main !== module) {
  throw new Error('This file should not be required');
}

var childProcess = require('child_process');
var fs = require('fs');

var paramFilePath = process.argv[2];

var serializedParams = fs.readFileSync(paramFilePath, 'utf8');
var params = JSON.parse(serializedParams);

var cmd = params.command;
var execOptions = params.execOptions;
var pipe = params.pipe;
var stdoutFile = params.stdoutFile;
var stderrFile = params.stderrFile;

function isMaxBufferError(err) {
  var maxBufferErrorPattern = /^.*\bmaxBuffer\b.*exceeded.*$/;
  if (err instanceof Error && err.message &&
        err.message.match(maxBufferErrorPattern)) {
    // < v10
    // Error: stdout maxBuffer exceeded
    return true;
  } else if (err instanceof RangeError && err.message &&
        err.message.match(maxBufferErrorPattern)) {
    // >= v10
    // RangeError [ERR_CHILD_PROCESS_STDIO_MAXBUFFER]: stdout maxBuffer length
    // exceeded
    return true;
  }
  return false;
}

var stdoutStream = fs.createWriteStream(stdoutFile);
var stderrStream = fs.createWriteStream(stderrFile);

/**
 * Executes a command and calls the callback function with the output.
 * The callback function is executed after the child process has finished, 
 * and includes the stdout, stderr, and error (if any) from the child process.
 * @param {string} cmd - The command to execute.
 * @param {object} execOptions - Additional options to pass to child_process.exec().
 * @param {string|Buffer} pipe - Input to pass to the child process.
 * @param {function} callback - The function to call with the output from the child process.
 */
function execWithCallback(cmd, execOptions, pipe, callback) {
  var c = childProcess.exec(cmd, execOptions, function (err, stdout, stderr) {
    if (!err) {
      callback(null, stdout, stderr);
    } else if (isMaxBufferError(err)) {
      callback('maxBuffer exceeded', null, null);
    } else if (err.code === undefined && err.message) {
      /* istanbul ignore next */
      callback(err.message, null, null);
    } else if (err.code === undefined) {
      /* istanbul ignore next */
      callback('Unknown issue', null, null);
    } else {
      callback(err, null, null);
    }
  });

  c.stdout.pipe(stdoutStream);
  c.stderr.pipe(stderrStream);
  c.stdout.pipe(process.stdout);
  c.stderr.pipe(process.stderr);

  if (pipe) {
    c.stdin.end(pipe);
  }
}

execWithCallback(cmd, execOptions, pipe, function (err, stdout, stderr) {
  if (err) {
    appendError(err, 1);
  } else {
    process.exitCode = 0;
  }
});

function appendError(message, code) {
  stderrStream.write(message);
  process.exitCode = code;
}

