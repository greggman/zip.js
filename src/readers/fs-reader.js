import Reader from './reader';
import BlobReader from './blob-reader';

function FSReader(filename, fs) {
  const that = this;

  function init(callback, onerror) {
    fs.stat(filename, (err, st) => {
      if (err) {
        return onerror(err);
      }
      that.size = st.size;
      callback();
    });
  }

  function readUint8Array(index, length, callback, onerror) {
    fs.open(that.filename, 'rb', (err, fd) => {
      if (err) {
        return onerror(err);
      } 
      const data = new Uint8Array(length);
      fs.read(fd, data, 0, length, index, (err, bytesRead) => {
        fs.close(fd, (closeErr) => {
          if (err || closeErr) {
            return onerror(err || closeErr);
          }
          callback(new Uint8Array(data.buffer, 0, bytesRead));
        });
      });
    });
  }

  that.filename = filename;
  that.size = 0;
  that.init = init;
  that.readUint8Array = readUint8Array;
}
FSReader.prototype = new Reader();
FSReader.prototype.constructor = BlobReader;

export {
  FSReader as default,
};
