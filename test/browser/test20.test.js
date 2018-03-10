import mime from 'mime-types';
import {assert} from 'chai';
import zip from '../../src/zip';
import requestFileSystem from './request-file-system';
import setZipConfig from './config';

describe('Demo readEntries()', function() {
  let resolve;
  let reject;

  it('should handle readEntries', async () => {
    setZipConfig();
    return new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
      // test();
      resolve();
    });
  });

  let filesystem;
  const zipFs = new zip.fs.FS();
  const THRESHOLD = 150;

  function generateFs(entry, onend, onerror) {
    let i = 0;

    function next() {
      i++;
      generateNextEntry();
    }

    function generateNextEntry() {
      if (i <= THRESHOLD)
        entry.getFile(i, {
          create: true
        }, next, onerror);
      else
        onend();
    }

    next();
  }

  function checkZipFileSystemSize() {
    zipFs.root.addFileEntry(filesystem.root, function() {
      assert.strictEqual(zipFs.root.children.length, THRESHOLD);
      resolve();
    }, reject);
  }

  function test() {
    requestFileSystem(window.TEMPORARY, 4 * 1024 * 1024 * 1024, function(fs) {
      filesystem = fs;
      generateFs(filesystem.root, checkZipFileSystemSize, reject);
    }, reject);
  }
});
