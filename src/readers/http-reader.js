import Reader from './reader';

function isHttpFamily(url) {
  const a = document.createElement('a');
  a.href = url;
  return a.protocol === 'http:' || a.protocol === 'https:';
}

function HttpReader(url) {
  const that = this;

  function getData(callback, onerror) {
    if (!that.data) {
      const request = new XMLHttpRequest();
      request.addEventListener('load', function() {
        if (!that.size)
          that.size = Number(request.getResponseHeader('Content-Length')) || Number(request.response.byteLength);
        that.data = new Uint8Array(request.response);
        callback();
      }, false);
      request.addEventListener('error', onerror, false);
      request.open('GET', url);
      request.responseType = 'arraybuffer';
      request.send();
    } else
      callback();
  }

  function init(callback, onerror) {
    if (!isHttpFamily(url)) {
      // For schemas other than http(s), HTTP HEAD may be unavailable,
      // so use HTTP GET instead.
      getData(callback, onerror);
      return;
    }
    const request = new XMLHttpRequest();
    request.addEventListener('load', function() {
      that.size = Number(request.getResponseHeader('Content-Length'));
      // If response header doesn't return size then prefetch the content.
      if (!that.size) {
        getData(callback, onerror);
      } else {
        callback();
      }
    }, false);
    request.addEventListener('error', onerror, false);
    request.open('HEAD', url);
    request.send();
  }

  function readUint8Array(index, length, callback, onerror) {
    getData(function() {
      callback(new Uint8Array(that.data.subarray(index, index + length)));
    }, onerror);
  }

  that.size = 0;
  that.init = init;
  that.readUint8Array = readUint8Array;
}
HttpReader.prototype = new Reader();
HttpReader.prototype.constructor = HttpReader;

export {
  HttpReader as default,
};
