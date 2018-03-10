import Writer from './writer';

let appendABViewSupported;
try {
  appendABViewSupported = new Blob([new DataView(new ArrayBuffer(0))]).size === 0;
} catch (e) {
}

const TEXT_PLAIN = 'text/plain';

function TextWriter(encoding) {
  const that = this;
  let blob;

  function init(callback) {
    blob = new Blob([], {
      type: TEXT_PLAIN,
    });
    callback();
  }

  function writeUint8Array(array, callback) {
    blob = new Blob([blob, appendABViewSupported ? array : array.buffer], {
      type: TEXT_PLAIN,
    });
    callback();
  }

  function getData(callback, onerror) {
    const reader = new FileReader();
    reader.onload = function (e) {
      callback(e.target.result);
    };
    reader.onerror = onerror;
    reader.readAsText(blob, encoding);
  }

  that.init = init;
  that.writeUint8Array = writeUint8Array;
  that.getData = getData;
}
TextWriter.prototype = new Writer();
TextWriter.prototype.constructor = TextWriter;

export {
  TextWriter as default,
};
