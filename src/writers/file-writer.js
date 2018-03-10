import Writer from './writer';

let appendABViewSupported;
try {
  appendABViewSupported = new Blob([new DataView(new ArrayBuffer(0))]).size === 0;
} catch (e) {
}


function FileWriter(fileEntry, contentType) {
  let writer;
  const that = this;

  function init(callback, onerror) {
    fileEntry.createWriter(function(fileWriter) {
      writer = fileWriter;
      callback();
    }, onerror);
  }

  function writeUint8Array(array, callback, onerror) {
    const blob = new Blob([appendABViewSupported ? array : array.buffer], {
      type: contentType,
    });
    writer.onwrite = function() {
      writer.onwrite = null;
      callback();
    };
    writer.onerror = onerror;
    writer.write(blob);
  }

  function getData(callback) {
    fileEntry.file(callback);
  }

  that.init = init;
  that.writeUint8Array = writeUint8Array;
  that.getData = getData;
}
FileWriter.prototype = new Writer();
FileWriter.prototype.constructor = FileWriter;

export {
  FileWriter as default,
};
