import mime from 'mime-types';
import {assert} from 'chai';
import zip from '../../src/zip';
import requestFileSystem from './request-file-system';
import setZipConfig from './config';

describe('Demo ZipEntry.prototype.getFileEntry (File)', () => {

  let resolve;
  let reject;

  it('should handle ZipEntry.prototype.getFileEntry (File)', async () => {
    setZipConfig();
    return new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
      test();
    });
  });
  
  const URL = 'base/test/browser/lorem.zip';
  const FILENAME = 'lorem.txt';
  const zipFs = new zip.fs.FS();
  let filesystem;

  function removeRecursively(entry, onend, onerror) {
    const rootReader = entry.createReader();
    rootReader.readEntries(function(entries) {
      let i = 0;

      function next() {
        i++;
        removeNextEntry();
      }

      function removeNextEntry() {
        const entry = entries[i];
        if (entry) {
          if (entry.isDirectory)
            removeRecursively(entry, next, onerror);
          if (entry.isFile)
            entry.remove(next, onerror);
        } else
          onend();
      }

      removeNextEntry();
    }, onerror);
  }

  function importZipToFilesystem(callback) {
    zipFs.importHttpContent(URL, false, function() {
      filesystem.root.getFile(FILENAME, {
        create: true,
      }, function(fileEntry) {
        const zippedFile = zipFs.root.getChildByName(FILENAME);
        zippedFile.getFileEntry(fileEntry, callback, null, reject);
      }, reject);
    }, reject);
  }

  function getFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
      callback(event.target.result);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  }

  const EXPECTED = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Nam liber tempor cum soluta nobis eleifend option congue nihil imperdiet doming id quod mazim placerat facer possim assum. Typi non habent claritatem insitam; est usus legentis in iis qui facit eorum claritatem. Investigationes demonstraverunt lectores legere me lius quod ii legunt saepius. Claritas est etiam processus dynamicus, qui sequitur mutationem consuetudium lectorum. Mirum est notare quam littera gothica, quam nunc putamus parum claram, anteposuerit litterarum formas humanitatis per seacula quarta decima et quinta decima. Eodem modo typi, qui nunc nobis videntur parum clari, fiant sollemnes in futurum.';
  function compare(file) {
    getFile(file, (content) => {
      if (content === EXPECTED) {
        resolve();
      } else {
        reject();
      }
    });
  }

  function check() {
    importZipToFilesystem(function() {
      filesystem.root.getFile(FILENAME, null, function(fileEntry) {
        fileEntry.file(compare, reject);
      }, reject);
    }, reject);
  }

  function test() {
    requestFileSystem(window.TEMPORARY, 4 * 1024 * 1024 * 1024, function(fs) {
      filesystem = fs;
      removeRecursively(filesystem.root, check, reject);
    }, reject);
  }
});
