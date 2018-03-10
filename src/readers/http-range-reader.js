import Reader from './reader';

const ERR_HTTP_RANGE = 'HTTP Range not supported.';

function HttpRangeReader(url) {
  const that = this;

  function init(callback, onerror) {
    const request = new XMLHttpRequest();
    request.addEventListener('load', function() {
      that.size = Number(request.getResponseHeader('Content-Length'));
      if (request.getResponseHeader('Accept-Ranges') == 'bytes')
        callback();
      else
        onerror(ERR_HTTP_RANGE);
    }, false);
    request.addEventListener('error', onerror, false);
    request.open('HEAD', url);
    request.send();
  }

  function readArrayBuffer(index, length, callback, onerror) {
    const request = new XMLHttpRequest();
    request.open('GET', url);
    request.responseType = 'arraybuffer';
    request.setRequestHeader('Range', `bytes=${index}-${index + length - 1}`);
    request.addEventListener('load', function() {
      callback(request.response);
    }, false);
    request.addEventListener('error', onerror, false);
    request.send();
  }

  function readUint8Array(index, length, callback, onerror) {
    readArrayBuffer(index, length, function(arraybuffer) {
      callback(new Uint8Array(arraybuffer));
    }, onerror);
  }

  that.size = 0;
  that.init = init;
  that.readUint8Array = readUint8Array;
}
HttpRangeReader.prototype = new Reader();
HttpRangeReader.prototype.constructor = HttpRangeReader;

export {
  HttpRangeReader as default,
};
