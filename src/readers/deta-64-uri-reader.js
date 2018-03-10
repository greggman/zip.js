import Reader from './reader';
import {getDataHelper} from '../utils';

function Data64URIReader(dataURI) {
  const that = this;
  let dataStart;

  function init(callback) {
    let dataEnd = dataURI.length;
    while (dataURI.charAt(dataEnd - 1) === '=') { dataEnd--; }
    dataStart = dataURI.indexOf(',') + 1;
    that.size = Math.floor((dataEnd - dataStart) * 0.75);
    callback();
  }

  function readUint8Array(index, length, callback) {
    const data = getDataHelper(length);
    const start = Math.floor(index / 3) * 4;
    const end = Math.ceil((index + length) / 3) * 4;
    const bytes = atob(dataURI.substring(start + dataStart, end + dataStart));
    const delta = index - Math.floor(start / 4) * 3;
    for (let i = delta; i < delta + length; i++) { data.array[i - delta] = bytes.charCodeAt(i); }
    callback(data.array);
  }

  that.size = 0;
  that.init = init;
  that.readUint8Array = readUint8Array;
}
Data64URIReader.prototype = new Reader();
Data64URIReader.prototype.constructor = Data64URIReader;

export {
  Data64URIReader as default,
};
