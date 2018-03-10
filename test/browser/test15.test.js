import mime from 'mime-types';
import {assert} from 'chai';
import zip from '../../src/zip';
import requestFileSystem from './request-file-system';
import setZipConfig from './config';

describe('Parallel reads', function() {
  this.timeout(20000);

  let resolve;
  let reject;

  it('should handle parallel reads', async () => {
    setZipConfig();
    return new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
      test();
    });
  });

  const MB = 1024 * 1024;
  const blobs = [
    {
      name: 'b1',
      blob: getBlob(3.5 * MB),
    }, {
      name: 'b2',
      blob: getBlob(5.2 * MB),
    }, {
      name: 'b3',
      blob: getBlob(4.7 * MB),
    }, {
      name: 'b4',
      blob: getBlob(2.8 * MB),
    },
  ];

  function zipBlobs(blobs, callback) {
    zip.createWriter(new zip.BlobWriter('application/zip'), function(zipWriter) {
      let index = 0;

      function next() {
        if (index < blobs.length) {
          zipWriter.add(blobs[index].name, new zip.BlobReader(blobs[index].blob), function() {
            index++;
            next();
          });
        } else {
          zipWriter.close(callback);
        }
      }

      next();
    }, reject);
  }

  function unzipBlob(blob) {
    let numEntries = 0;
    zip.createReader(new zip.BlobReader(blob), function(zipReader) {
      zipReader.getEntries(function(entries) {
        numEntries = entries.length;
        entries.forEach(readEntry);
      });
    }, reject);

    function readEntry(ent, i) {
      let lastLogPos = 0;
      ent.getData(
        new zip.BlobWriter(), 
        function onload(blob) {
          console.log('finished:', ent.filename, 'size:', blob.size);
          compareResult(blob, i, () => {
            --numEntries;
            if (numEntries === 0) {
              resolve();
            }
          });
        }, 
        function onprogress(loaded, size) {
          if (loaded - lastLogPos > 100 * 1024) { // limit progress log
            console.log('onprogress:', ent.filename, 'loaded:', loaded, 'size:', size);
            lastLogPos = loaded;
          }
        },
        true
      ); // check crc32
    }
  }

  function compareResult(result, index, callback) {
    const fr1 = new FileReader();
    const fr2 = new FileReader();
    let loadCount = 0;
    fr1.readAsArrayBuffer(blobs[index].blob);
    fr2.readAsArrayBuffer(result);
    fr1.onload = fr2.onload = function onload() {
      if (++loadCount === 2) {
        const a1 = new Float64Array(fr1.result);
        const a2 = new Float64Array(fr2.result);
        if (a1.length !== a2.length)
          return fail();
        for (let i = 0, n = a1.length; i < n; i++) {
          if (a1[i] !== a2[i])
            return fail();
        }
        console.log('compareResult OK at:', blobs[index].name);
        callback();
      }
    };
    function fail() {
      console.error('Error: compareBlobs failed at:', blobs[index].name);
      reject();
    }
  }

  function getBlob(size) {
    const data = new Float64Array(Math.floor(size / 8));
    const rand = Math.random;
    for (let i = 0, n = data.length; i < n; i++)
      data[i] = rand();
    return new Blob([data]);
  }

  function test() {
    zipBlobs(blobs, function(zippedBlob) {
      unzipBlob(zippedBlob);
    });
  }
});
