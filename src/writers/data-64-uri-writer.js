import Writer from './writer';

function Data64URIWriter(contentType) {
  const that = this;
  let data = '';
  let pending = '';

  function init(callback) {
    data += `data:${contentType || ''};base64,`;
    callback();
  }

  function writeUint8Array(array, callback) {
    let i;
    const delta = pending.length;
    let dataString = pending;
    pending = '';
    for (i = 0; i < (Math.floor((delta + array.length) / 3) * 3) - delta; i++) { dataString += String.fromCharCode(array[i]); }
    for (; i < array.length; i++) { pending += String.fromCharCode(array[i]); }
    if (dataString.length > 2) { data += btoa(dataString); } else { pending = dataString; }
    callback();
  }

  function getData(callback) {
    callback(data + btoa(pending));
  }

  that.init = init;
  that.writeUint8Array = writeUint8Array;
  that.getData = getData;
}
Data64URIWriter.prototype = new Writer();
Data64URIWriter.prototype.constructor = Data64URIWriter;

export {
  Data64URIWriter as default,
};
