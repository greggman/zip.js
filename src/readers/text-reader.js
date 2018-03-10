import Reader from './reader';
import BlobReader from './blob-reader';

const TEXT_PLAIN = 'text/plain';

function TextReader(text) {
  const that = this;
  let blobReader;

  function init(callback, onerror) {
    const blob = new Blob([text], {
      type: TEXT_PLAIN,
    });
    blobReader = new BlobReader(blob);
    blobReader.init(() => {
      that.size = blobReader.size;
      callback();
    }, onerror);
  }

  function readUint8Array(index, length, callback, onerror) {
    blobReader.readUint8Array(index, length, callback, onerror);
  }

  that.size = 0;
  that.init = init;
  that.readUint8Array = readUint8Array;
}
TextReader.prototype = new Reader();
TextReader.prototype.constructor = TextReader;

export {
  TextReader as default,
};
