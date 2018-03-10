import Reader from './reader';

function ArrayBufferReader(arrayBuffer) {
  const that = this;

  function init(callback, onerror) {
    that.size = arrayBuffer.byteLength;
    callback();
  }

  function readUint8Array(index, length, callback, onerror) {
    callback(new Uint8Array(arrayBuffer.slice(index, index + length)));
  }

  that.size = 0;
  that.init = init;
  that.readUint8Array = readUint8Array;
}
ArrayBufferReader.prototype = new Reader();
ArrayBufferReader.prototype.constructor = ArrayBufferReader;

export {
  ArrayBufferReader as default,
};
