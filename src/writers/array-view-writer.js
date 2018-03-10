import Writer from './writer';

function ArrayBufferWriter() {
  let array;
  const that = this;

  function init(callback, onerror) {
    array = new Uint8Array();
    callback();
  }

  function writeUint8Array(arr, callback, onerror) {
    const tmpArray = new Uint8Array(array.length + arr.length);
    tmpArray.set(array);
    tmpArray.set(arr, array.length);
    array = tmpArray;
    callback();
  }

  function getData(callback) {
    callback(array.buffer);
  }

  that.init = init;
  that.writeUint8Array = writeUint8Array;
  that.getData = getData;
}
ArrayBufferWriter.prototype = new Writer();
ArrayBufferWriter.prototype.constructor = ArrayBufferWriter;

export {
  ArrayBufferWriter as default,
};
