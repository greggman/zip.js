import workerConfig from './worker-config';
import createWorker from './create-worker';
import {getDataHelper} from './utils';
import {copy, deflate} from './core';
import * as errors from './errors';

function encodeUTF8(string) {
  return unescape(encodeURIComponent(string));
}

function getBytes(str) {
  const array = [];
  for (let i = 0; i < str.length; i++) { array.push(str.charCodeAt(i)); }
  return array;
}

function createZipWriter(writer, callback, onerror, dontDeflate) {
  const files = {};
  const filenames = [];
  let datalength = 0;
  let deflateSN = 0;

  function onwriteerror(err) {
    onerror(err || errors.ERR_WRITE);
  }

  function onreaderror(err) {
    onerror(err || errors.ERR_READ_DATA);
  }

  const zipWriter = {
    add(name, reader, onend, onprogress, options) {
      let header,
        filename,
        date;
      const worker = this._worker;

      function writeHeader(callback) {
        date = options.lastModDate || new Date();
        header = getDataHelper(26);
        files[name] = {
          headerArray: header.array,
          directory: options.directory,
          filename,
          offset: datalength,
          comment: getBytes(encodeUTF8(options.comment || '')),
        };
        header.view.setUint32(0, 0x14000808);
        if (options.version) { header.view.setUint8(0, options.version); }
        if (!dontDeflate && options.level !== 0 && !options.directory) { header.view.setUint16(4, 0x0800); }
        header.view.setUint16(6, (((date.getHours() << 6) | date.getMinutes()) << 5) | date.getSeconds() / 2, true);
        header.view.setUint16(8, ((((date.getFullYear() - 1980) << 4) | (date.getMonth() + 1)) << 5) | date.getDate(), true);
        header.view.setUint16(22, filename.length, true);
        const data = getDataHelper(30 + filename.length);
        data.view.setUint32(0, 0x504b0304);
        data.array.set(header.array, 4);
        data.array.set(filename, 30);
        datalength += data.array.length;
        writer.writeUint8Array(data.array, callback, onwriteerror);
      }

      function writeFooter(compressedLength, crc32) {
        const footer = getDataHelper(16);
        datalength += compressedLength || 0;
        footer.view.setUint32(0, 0x504b0708);
        if (typeof crc32 !== 'undefined') {
          header.view.setUint32(10, crc32, true);
          footer.view.setUint32(4, crc32, true);
        }
        if (reader) {
          footer.view.setUint32(8, compressedLength, true);
          header.view.setUint32(14, compressedLength, true);
          footer.view.setUint32(12, reader.size, true);
          header.view.setUint32(18, reader.size, true);
        }
        writer.writeUint8Array(footer.array, () => {
          datalength += 16;
          onend();
        }, onwriteerror);
      }

      function writeFile() {
        options = options || {};
        name = name.trim();
        if (options.directory && name.charAt(name.length - 1) != '/') { name += '/'; }
        if (files.hasOwnProperty(name)) {
          onerror(errors.ERR_DUPLICATED_NAME);
          return;
        }
        filename = getBytes(encodeUTF8(name));
        filenames.push(name);
        writeHeader(() => {
          if (reader)
            {if (dontDeflate || options.level === 0)
                copy(worker, deflateSN++, reader, writer, 0, reader.size, true, writeFooter, onprogress, onreaderror, onwriteerror);
              else
                deflate(worker, deflateSN++, reader, writer, options.level, writeFooter, onprogress, onreaderror, onwriteerror);}
          else
            {writeFooter();}
        }, onwriteerror);
      }

      if (reader) { reader.init(writeFile, onreaderror); } else { writeFile(); }
    },
    close(callback) {
      if (this._worker) {
        this._worker.terminate();
        this._worker = null;
      }

      let length = 0;
      let index = 0;
      for (let indexFilename = 0; indexFilename < filenames.length; indexFilename++) {
        const file = files[filenames[indexFilename]];
        length += 46 + file.filename.length + file.comment.length;
      }
      const data = getDataHelper(length + 22);
      for (let indexFilename = 0; indexFilename < filenames.length; indexFilename++) {
        const file = files[filenames[indexFilename]];
        data.view.setUint32(index, 0x504b0102);
        data.view.setUint16(index + 4, 0x1400);
        data.array.set(file.headerArray, index + 6);
        data.view.setUint16(index + 32, file.comment.length, true);
        if (file.directory) { data.view.setUint8(index + 38, 0x10); }
        data.view.setUint32(index + 42, file.offset, true);
        data.array.set(file.filename, index + 46);
        data.array.set(file.comment, index + 46 + file.filename.length);
        index += 46 + file.filename.length + file.comment.length;
      }
      data.view.setUint32(index, 0x504b0506);
      data.view.setUint16(index + 8, filenames.length, true);
      data.view.setUint16(index + 10, filenames.length, true);
      data.view.setUint32(index + 12, length, true);
      data.view.setUint32(index + 16, datalength, true);
      writer.writeUint8Array(data.array, () => {
        writer.getData(callback);
      }, onwriteerror);
    },
    _worker: null,
  };

  if (!workerConfig.useWebWorkers) {
    callback(zipWriter);
  } else {
    createWorker(
      'deflater',
      (worker) => {
        zipWriter._worker = worker;
        callback(zipWriter);
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

function createWriter(writer, callback, onerror, dontDeflate) {
  onerror = onerror || onerror_default;
  dontDeflate = !!dontDeflate;

  writer.init(() => {
    createZipWriter(writer, callback, onerror, dontDeflate);
  }, onerror);
}

export {
  createWriter as default,
};
