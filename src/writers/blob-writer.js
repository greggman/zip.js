import Writer from './writer';

let appendABViewSupported;
try {
  appendABViewSupported = new Blob([new DataView(new ArrayBuffer(0))]).size === 0;
} catch (e) {
}

function BlobWriter(contentType) {
  let blob;
  const that = this;

  function init(callback) {
    blob = new Blob([], {
      type: contentType,
    });
    callback();
  }

  function writeUint8Array(array, callback) {
    blob = new Blob([blob, appendABViewSupported ? array : array.buffer], {
      type: contentType,
    });
    callback();
  }

  function getData(callback) {
    callback(blob);
  }

  that.init = init;
  that.writeUint8Array = writeUint8Array;
  that.getData = getData;
}
BlobWriter.prototype = new Writer();
BlobWriter.prototype.constructor = BlobWriter;

export {
  BlobWriter as default,
};
