var util = require('util'),
    fs = require('fs'),
    stream = require('stream'),
    Writable = stream.Writable,
    constants = process.binding('constants');

if (constants.fs) {
    // nodejs-6 divide constants into logical groups,
    // we're interested in `fs` constants only
    constants = constants.fs;
}

// pray for kernels gods to work, if node version <0.10.29,
// which does not includes the commit http://git.io/mW15lA
var O_NONBLOCK = constants.O_NONBLOCK || 04000,
    S_IFIFO = constants.S_IFIFO,
    O_WRONLY = constants.O_WRONLY;

/**
 * @constructor
 * @class WriteStream
 * @augments stream.Writable
 * @param {String} path FIFO object file path
 * @param {Object} [options] @see {@link http://nodejs.org/api/stream.html common writable stream options}
 * @returns {WriteStream}
 */
function WriteStream(path, options) {
    Writable.call(this, options);
    this.path = path;
    this.fstream = null;

    setImmediate(this.init.bind(this));
}

util.inherits(WriteStream, Writable);

function isFIFOWritable(path) {
    try {
        var fd = fs.openSync(path, O_WRONLY | O_NONBLOCK, S_IFIFO);
        fs.close(fd);
    } catch(e) {
        return false;
    }
    return true;
}

/**
 * Try to initialize underlying fs.WriteStream
 * @fires WriteStream#nofifo
 */
WriteStream.prototype.init = function() {
    if (this.fstream !== null) {
        return;
    }

    if ( ! isFIFOWritable(this.path)) {
        this.emit('nofifo', this.path);
        return;
    }

    var self = this;

    this.fstream = fs.createWriteStream(this.path, { flags: O_WRONLY, mode: S_IFIFO });

    this.fstream.on('error', function(error) {
        self.fstream = null;

        if (error.code === 'EPIPE') {
            self.emit('nofifo', self.path, error);
        } else {
            self.emit('error', error);
        }
    });

    this.fstream.on('finish', function() {
        self.fstream = null;
        self.emit('finish');
    });

    this.fstream.on('drain', this.emit.bind(this, 'drain'));
    this.emit('drain');
};

/**
 * @see {@link http://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback_1}
 * @private
 */
WriteStream.prototype._write = function(chunk, encoding, callback) {
    if (this.fstream === null) {
        setImmediate(callback);
        return false;
    } else {
        return this.fstream.write(chunk, encoding, callback);
    }
};

exports.WriteStream = WriteStream;

exports.createWriteStream = function(path) {
    return new WriteStream(path);
};
