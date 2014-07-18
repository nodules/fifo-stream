## What is it?

Module provides `WriteStream` which behaves like `fs.WriteStream` (and has underlying one, actually),
but has some specifics to work in non-blocking way with
[Unix named pipes](http://en.wikipedia.org/wiki/Named_pipe#In_Unix) (aka FIFO).

## What's the difference?

In addition to fs streams, `WriteStream` provides event `nofifo` and method `init`.

Stream fires `nofifo` if pipe became unavailable for writing. At this point you have two options:

 * if listener for the `nofifo` event was not set, then `error` will be emitted as fs stream does;
 * you can set a listener for `nofifo` and call `WriteStream#init()` inside to try to open pipe again.

While pipe is not available for non-blocking write (and underlying fs stream is not initialized),
`WriteStream#write()` returns `false`. When pipe becomes available, `WriteStream` emits `drain` event and
client can continue to write into the stream.

## Example

```javascript
var pipePath = '/var/run/mydaemon.pipe',
    fifo = require('fifo-stream').createWriteStream(pipePath);

fifo.on('nofifo', function() {
    // if pipe became unavailable, then wait 1 second and try to reopen it
    setTimeout(function() {
        fifo.init();
    }, 1000);
});

var i = 0,
    messagesToSend = 1000000;

function writeMessages() {
    if (i++ > messagesToSend) {
        return;
    }

    if ( ! fifo.write('the message')) {
        // wait until pipe became available
        fifo.once('drain', writeMessages);
    } else {
        setImmediate(writeMessages);
    }
}

writeMessages();
```
