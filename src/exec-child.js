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

var predevCmd = execOptions.env.npm_lifecycle_event === 'predev' ? cmd : null;
var predev = childProcess.exec(predevCmd, execOptions, function (err) {
  if (err) {
    appendError('Error in predev script', 1);
  }
});

predev.on('exit', function (code) {
  if (code === 0) {
    var devCmd = execOptions.env.npm_lifecycle_event === 'dev' ? cmd : null;
    var dev = childProcess.exec(devCmd, execOptions, function (err) {
      if (!err) {
        process.exitCode = 0;
      } else if (isMaxBufferError(err)) {
        appendError('maxBuffer exceeded', 1);
      } else if (err.code === undefined && err.message) {
        /* istanbul ignore next */
        appendError(err.message, 1);
      } else if (err.code === undefined) {
        /* istanbul ignore next */
        appendError('Unknown issue', 1);
      } else {
        process.exitCode = err.code;
      }
    });

    dev.stdout.pipe(stdoutStream);
    dev.stderr.pipe(stderrStream);
    dev.stdout.pipe(process.stdout);
    dev.stderr.pipe(process.stderr);

    if (pipe) {
      dev.stdin.end(pipe);
    }
  } else {
    appendError('Error in predev script', 1);
  }
});

function appendError(message, code) {
  stderrStream.write(message);
  process.exitCode = code;
}

if (!predevCmd) {
  appendError('This script is not being executed as part of npm predev or dev scripts', 1);
} 

