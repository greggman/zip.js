import workerConfig from './worker-config';
import createWorker from './create-worker';
import {getDataHelper} from './utils';
import {copy, inflate} from './core';
import * as errors from './errors';


const extendedASCII = [
  '\u00C7', '\u00FC', '\u00E9', '\u00E2', '\u00E4', '\u00E0', '\u00E5', '\u00E7', '\u00EA', '\u00EB',
  '\u00E8', '\u00EF', '\u00EE', '\u00EC', '\u00C4', '\u00C5', '\u00C9', '\u00E6', '\u00C6', '\u00F4', '\u00F6', '\u00F2', '\u00FB', '\u00F9',
  '\u00FF', '\u00D6', '\u00DC', '\u00F8', '\u00A3', '\u00D8', '\u00D7', '\u0192', '\u00E1', '\u00ED', '\u00F3', '\u00FA', '\u00F1', '\u00D1',
  '\u00AA', '\u00BA', '\u00BF', '\u00AE', '\u00AC', '\u00BD', '\u00BC', '\u00A1', '\u00AB', '\u00BB', '_', '_', '_', '\u00A6', '\u00A6',
  '\u00C1', '\u00C2', '\u00C0', '\u00A9', '\u00A6', '\u00A6', '+', '+', '\u00A2', '\u00A5', '+', '+', '-', '-', '+', '-', '+', '\u00E3',
  '\u00C3', '+', '+', '-', '-', '\u00A6', '-', '+', '\u00A4', '\u00F0', '\u00D0', '\u00CA', '\u00CB', '\u00C8', 'i', '\u00CD', '\u00CE',
  '\u00CF', '+', '+', '_', '_', '\u00A6', '\u00CC', '_', '\u00D3', '\u00DF', '\u00D4', '\u00D2', '\u00F5', '\u00D5', '\u00B5', '\u00FE',
  '\u00DE', '\u00DA', '\u00DB', '\u00D9', '\u00FD', '\u00DD', '\u00AF', '\u00B4', '\u00AD', '\u00B1', '_', '\u00BE', '\u00B6', '\u00A7',
  '\u00F7', '\u00B8', '\u00B0', '\u00A8', '\u00B7', '\u00B9', '\u00B3', '\u00B2', '_', ' ',
];
function decodeASCII(str) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i) & 0xFF;
    if (charCode > 127) { out += extendedASCII[charCode - 128]; } else { out += String.fromCharCode(charCode); }
  }
  return out;
}

function decodeUTF8(string) {
  return decodeURIComponent(escape(string));
}

function getString(bytes) {
  let i,
    str = '';
  for (i = 0; i < bytes.length; i++) { str += String.fromCharCode(bytes[i]); }
  return str;
}

function getDate(timeRaw) {
  const date = (timeRaw & 0xffff0000) >> 16;
  const time = timeRaw & 0x0000ffff;
  try {
    return new Date(
      1980 + ((date & 0xFE00) >> 9), ((date & 0x01E0) >> 5) - 1, date & 0x001F, (time & 0xF800) >> 11, (time & 0x07E0) >> 5,
      (time & 0x001F) * 2, 0,
    );
  } catch (e) {
  }
}

function readCommonHeader(entry, data, index, centralDirectory, onerror) {
  entry.version = data.view.getUint16(index, true);
  entry.bitFlag = data.view.getUint16(index + 2, true);
  entry.compressionMethod = data.view.getUint16(index + 4, true);
  entry.lastModDateRaw = data.view.getUint32(index + 6, true);
  entry.lastModDate = getDate(entry.lastModDateRaw);
  if ((entry.bitFlag & 0x01) === 0x01) {
    onerror(errors.ERR_ENCRYPTED);
    return;
  }
  if (centralDirectory || (entry.bitFlag & 0x0008) != 0x0008) {
    entry.crc32 = data.view.getUint32(index + 10, true);
    entry.compressedSize = data.view.getUint32(index + 14, true);
    entry.uncompressedSize = data.view.getUint32(index + 18, true);
  }
  if (entry.compressedSize === 0xFFFFFFFF || entry.uncompressedSize === 0xFFFFFFFF) {
    onerror(errors.ERR_ZIP64);
    return;
  }
  entry.filenameLength = data.view.getUint16(index + 22, true);
  entry.extraFieldLength = data.view.getUint16(index + 24, true);
}

function createZipReader(reader, callback, onerror) {
  let inflateSN = 0;

  function Entry() {
  }

  Entry.prototype.getData = function (writer, onend, onprogress, checkCrc32) {
    const that = this;

    function testCrc32(crc32) {
      const dataCrc32 = getDataHelper(4);
      dataCrc32.view.setUint32(0, crc32);
      return that.crc32 == dataCrc32.view.getUint32(0);
    }

    function getWriterData(uncompressedSize, crc32) {
      if (checkCrc32 && !testCrc32(crc32)) { onerror(errors.ERR_CRC); } else {
 writer.getData((data) => {
        onend(data);
      });
      }
    }

    function onreaderror(err) {
      onerror(err || errors.ERR_READ_DATA);
    }

    function onwriteerror(err) {
      onerror(err || errors.ERR_WRITE_DATA);
    }

    reader.readUint8Array(that.offset, 30, (bytes) => {
      const data = getDataHelper(bytes.length, bytes);
      if (data.view.getUint32(0) != 0x504b0304) {
        onerror(errors.ERR_BAD_FORMAT);
        return;
      }
      readCommonHeader(that, data, 4, false, onerror);
      const dataOffset = that.offset + 30 + that.filenameLength + that.extraFieldLength;
      writer.init(() => {
        if (that.compressionMethod === 0)
          {copy(that._worker, inflateSN++, reader, writer, dataOffset, that.compressedSize, checkCrc32, getWriterData, onprogress, onreaderror, onwriteerror);}
        else
          {inflate(that._worker, inflateSN++, reader, writer, dataOffset, that.compressedSize, checkCrc32, getWriterData, onprogress, onreaderror, onwriteerror);}
      }, onwriteerror);
    }, onreaderror);
  };

  function seekEOCDR(eocdrCallback) {
    // "End of central directory record" is the last part of a zip archive, and is at least 22 bytes long.
    // Zip file comment is the last part of EOCDR and has max length of 64KB,
    // so we only have to search the last 64K + 22 bytes of a archive for EOCDR signature (0x06054b50).
    const EOCDR_MIN = 22;
    if (reader.size < EOCDR_MIN) {
      onerror(errors.ERR_BAD_FORMAT);
      return;
    }
    const ZIP_COMMENT_MAX = 256 * 256;
    const EOCDR_MAX = EOCDR_MIN + ZIP_COMMENT_MAX;

    // In most cases, the EOCDR is EOCDR_MIN bytes long
    doSeek(EOCDR_MIN, () => {
      // If not found, try within EOCDR_MAX bytes
      doSeek(Math.min(EOCDR_MAX, reader.size), () => {
        onerror(errors.ERR_BAD_FORMAT);
      });
    });

    // seek last length bytes of file for EOCDR
    function doSeek(length, eocdrNotFoundCallback) {
      reader.readUint8Array(reader.size - length, length, (bytes) => {
        for (let i = bytes.length - EOCDR_MIN; i >= 0; i--) {
          if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
            eocdrCallback(new DataView(bytes.buffer, i, EOCDR_MIN));
            return;
          }
        }
        eocdrNotFoundCallback();
      }, () => {
        onerror(errors.ERR_READ);
      });
    }
  }

  const zipReader = {
    getEntries(callback) {
      const worker = this._worker;
      // look for End of central directory record
      seekEOCDR((dataView) => {
        const datalength = dataView.getUint32(16, true);
        const fileslength = dataView.getUint16(8, true);
        if (datalength < 0 || datalength >= reader.size) {
          onerror(errors.ERR_BAD_FORMAT);
          return;
        }
        reader.readUint8Array(datalength, reader.size - datalength, (bytes) => {
            let i;
            let index = 0;
            const entries = [];
            const data = getDataHelper(bytes.length, bytes);
            for (i = 0; i < fileslength; i++) {
              const entry = new Entry();
              entry._worker = worker;
              if (data.view.getUint32(index) != 0x504b0102) {
                onerror(errors.ERR_BAD_FORMAT);
                return;
              }
              readCommonHeader(entry, data, index + 6, true, onerror);
              entry.commentLength = data.view.getUint16(index + 32, true);
              entry.directory = ((data.view.getUint8(index + 38) & 0x10) == 0x10);
              entry.offset = data.view.getUint32(index + 42, true);
              const filename = getString(data.array.subarray(index + 46, index + 46 + entry.filenameLength));
              entry.filename = ((entry.bitFlag & 0x0800) === 0x0800) ? decodeUTF8(filename) : decodeASCII(filename);
              if (!entry.directory && entry.filename.charAt(entry.filename.length - 1) == '/')
                entry.directory = true;
              const comment = getString(data.array.subarray(index + 46 + entry.filenameLength + entry.extraFieldLength, index + 46
                  + entry.filenameLength + entry.extraFieldLength + entry.commentLength));
              entry.comment = ((entry.bitFlag & 0x0800) === 0x0800) ? decodeUTF8(comment) : decodeASCII(comment);
              entries.push(entry);
              index += 46 + entry.filenameLength + entry.extraFieldLength + entry.commentLength;
            }
            callback(entries);
          }, () => {
            onerror(errors.ERR_READ);
          });
      });
    },
    close(callback) {
      if (this._worker) {
        this._worker.terminate();
        this._worker = null;
      }
      if (callback) { callback(); }
    },
    _worker: null,
  };

  if (!workerConfig.useWebWorkers) {
    callback(zipReader);
  } else {
    createWorker(
      'inflater',
      (worker) => {
        zipReader._worker = worker;
        callback(zipReader);
      },
      (err) => {
        onerror(err);
      },
    );
  }
}

function onerror_default(error) {
  console.error(error);
}

function createReader(reader, callback, onerror) {
  onerror = onerror || onerror_default;

  reader.init(() => {
    createZipReader(reader, callback, onerror);
  }, onerror);
}

export {
  createReader as default,
};
