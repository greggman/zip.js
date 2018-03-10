import Reader from './reader';

function blobSlice(blob, index, length) {
  if (index < 0 || length < 0 || index + length > blob.size) { throw new RangeError(`offset:${index}, length:${length}, size:${blob.size}`); }
  if (blob.slice) { return blob.slice(index, index + length); } else if (blob.webkitSlice) { return blob.webkitSlice(index, index + length); } else if (blob.mozSlice) { return blob.mozSlice(index, index + length); } else if (blob.msSlice) { return blob.msSlice(index, index + length); }
}

function BlobReader(blob) {
  const that = this;

  function init(callback) {
    that.size = blob.size;
    callback();
  }

  function readUint8Array(index, length, callback, onerror) {
    const reader = new FileReader();
    reader.onload = function (e) {
      callback(new Uint8Array(e.target.result));
    };
    reader.onerror = onerror;
    try {
      reader.readAsArrayBuffer(blobSlice(blob, index, length));
    } catch (e) {
      onerror(e);
    }
  }

  that.size = 0;
  that.init = init;
  that.readUint8Array = readUint8Array;
}
BlobReader.prototype = new Reader();
BlobReader.prototype.constructor = BlobReader;

export {
  BlobReader as default,
};
