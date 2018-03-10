import requestFileSystem from './request-file-system';

function onerror(...args) {
  console.error(...args);
}

function createTempFile(callback) {
  const TMP_FILENAME = 'file.tmp';
  const requestFileSystem = window.webkitRequestFileSystem || window.mozRequestFileSystem || window.requestFileSystem;

  requestFileSystem(window.TEMPORARY, 4 * 1024 * 1024 * 1024, function(filesystem) {
    function create() {
      filesystem.root.getFile(TMP_FILENAME, {
        create: true,
      }, function(entry) {
        callback(entry);
      }, onerror);
    }

    filesystem.root.getFile(TMP_FILENAME, null, function(entry) {
      entry.remove(create, create);
    }, create);
  });
}

export {
  createTempFile, // eslint-disable-line
};
