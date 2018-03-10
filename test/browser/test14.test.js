import mime from 'mime-types';
import {assert} from 'chai';
import zip from '../../src/zip';
import requestFileSystem from './request-file-system';
import setZipConfig from './config';

describe('Demo ZipEntry.prototype.addFileEntry (Directory)', () => {

  let resolve;
  let reject;

  it('should handle Demo ZipEntry.prototype.addFileEntry (Directory)', async () => {
    setZipConfig();
    return new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
      test();
    });
  });

  const TEXT_CONTENT = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Nam liber tempor cum soluta nobis eleifend option congue nihil imperdiet doming id quod mazim placerat facer possim assum. Typi non habent claritatem insitam; est usus legentis in iis qui facit eorum claritatem. Investigationes demonstraverunt lectores legere me lius quod ii legunt saepius. Claritas est etiam processus dynamicus, qui sequitur mutationem consuetudium lectorum. Mirum est notare quam littera gothica, quam nunc putamus parum claram, anteposuerit litterarum formas humanitatis per seacula quarta decima et quinta decima. Eodem modo typi, qui nunc nobis videntur parum clari, fiant sollemnes in futurum.';
  let filesystem;
  const zipFs = new zip.fs.FS();

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

  function addDirectoryAndReadFile(callback) {
    zipFs.root.addFileEntry(filesystem.root, function() {
      const zipEntry = zipFs.root.getChildByName('aaa').getChildByName('ccc').getChildByName('lorem.txt');
      zipEntry.getText(callback);
    }, reject);
  }

  function initFileSystem(callback) {
    filesystem.root.getDirectory('aaa', {
      create: true,
    }, function(directoryEntry) {
      directoryEntry.getDirectory('ccc', {
        create: true,
      }, function(directoryEntry) {
        directoryEntry.getFile('lorem.txt', {
          create: true,
        }, function(fileEntry) {
          fileEntry.createWriter(function(writer) {
            writer.onwrite = callback;
            writer.onerror = reject;
            writer.write(new Blob([TEXT_CONTENT], {
              type: 'text/plain',
            }));
          }, reject);
        }, reject);
      }, reject);
    }, reject);
  }

  function check() {
    initFileSystem(function() {
      addDirectoryAndReadFile(function(text) {
        assert.strictEqual(text, TEXT_CONTENT);
        resolve();
      }, reject);
    });
  }

  function test() {
    requestFileSystem(window.TEMPORARY, 4 * 1024 * 1024 * 1024, function(fs) {
      filesystem = fs;
      removeRecursively(filesystem.root, check, reject);
    }, reject);
  }
});
