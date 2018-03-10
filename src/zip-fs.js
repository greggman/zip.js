/*
 Copyright (c) 2013 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import mime from 'mime-types';
import TextReader from './readers/text-reader';
import TextWriter from './writers/text-writer';
import BlobReader from './readers/blob-reader';
import BlobWriter from './writers/blob-writer';
import Data64URIReader from './readers/deta-64-uri-reader';
import Data64URIWriter from './writers/data-64-uri-writer';
import FileWriter from './writers/file-writer';
import Reader from './readers/reader';
import HttpReader from './readers/http-reader';
import HttpRangeReader from './readers/http-range-reader';
import createReader from './create-reader';
import createWriter from './create-writer';

const CHUNK_SIZE = 512 * 1024;

function ZipBlobReader(entry) {
  const that = this;
  let blobReader;

  function init(callback) {
    that.size = entry.uncompressedSize;
    callback();
  }

  function getData(callback) {
    if (that.data)
      callback();
    else
      entry.getData(new BlobWriter(), function(data) {
        that.data = data;
        blobReader = new BlobReader(data);
        callback();
      }, null, that.checkCrc32);
  }

  function readUint8Array(index, length, callback, onerror) {
    getData(function() {
      blobReader.readUint8Array(index, length, callback, onerror);
    }, onerror);
  }

  that.size = 0;
  that.init = init;
  that.readUint8Array = readUint8Array;
}
ZipBlobReader.prototype = new Reader();
ZipBlobReader.prototype.constructor = ZipBlobReader;
ZipBlobReader.prototype.checkCrc32 = false;

function getTotalSize(entry) {
  let size = 0;

  function process(entry) {
    size += entry.uncompressedSize || 0;
    entry.children.forEach(process);
  }

  process(entry);
  return size;
}

function initReaders(entry, onend, onerror) {
  let index = 0;

  function next() {
    index++;
    if (index < entry.children.length)
      process(entry.children[index]);
    else
      onend();
  }

  function process(child) {
    if (child.directory)
      initReaders(child, next, onerror);
    else {
      child.reader = new child.Reader(child.data, onerror);
      child.reader.init(function() {
        child.uncompressedSize = child.reader.size;
        next();
      });
    }
  }

  if (entry.children.length)
    process(entry.children[index]);
  else
    onend();
}

function detach(entry) {
  const children = entry.parent.children;
  children.forEach(function(child, index) {
    if (child.id == entry.id)
      children.splice(index, 1);
  });
}

function exportZip(zipWriter, entry, onend, onprogress, totalSize) {
  let currentIndex = 0;

  function process(zipWriter, entry, onend, onprogress, totalSize) {
    let childIndex = 0;

    function exportChild() {
      const child = entry.children[childIndex];
      if (child)
        zipWriter.add(child.getFullname(), child.reader, function() {
          currentIndex += child.uncompressedSize || 0;
          process(zipWriter, child, function() {
            childIndex++;
            exportChild();
          }, onprogress, totalSize);
        }, function(index) {
          if (onprogress)
            onprogress(currentIndex + index, totalSize);
        }, {
          directory: child.directory,
          version: child.zipVersion,
        });
      else
        onend();
    }

    exportChild();
  }

  process(zipWriter, entry, onend, onprogress, totalSize);
}

function addFileEntry(zipEntry, fileEntry, onend, onerror) {
  function getChildren(fileEntry, callback) {
    let entries = [];
    if (fileEntry.isDirectory) {
      const directoryReader = fileEntry.createReader();
      (function readEntries() {
        directoryReader.readEntries(function(temporaryEntries) {
          if (!temporaryEntries.length)
            callback(entries);
          else {
            entries = entries.concat(temporaryEntries);
            readEntries();
          }
        }, onerror);
      }());
    }
    if (fileEntry.isFile)
      callback(entries);
  }

  function process(zipEntry, fileEntry, onend) {
    getChildren(fileEntry, function(children) {
      let childIndex = 0;

      function addChild(child) {
        function nextChild(childFileEntry) {
          process(childFileEntry, child, function() {
            childIndex++;
            processChild();
          });
        }

        if (child.isDirectory)
          nextChild(zipEntry.addDirectory(child.name));
        if (child.isFile)
          child.file(function(file) {
            const childZipEntry = zipEntry.addBlob(child.name, file);
            childZipEntry.uncompressedSize = file.size;
            nextChild(childZipEntry);
          }, onerror);
      }

      function processChild() {
        const child = children[childIndex];
        if (child)
          addChild(child);
        else
          onend();
      }

      processChild();
    });
  }

  if (fileEntry.isDirectory)
    process(zipEntry, fileEntry, onend);
  else
    fileEntry.file(function(file) {
      zipEntry.addBlob(fileEntry.name, file);
      onend();
    }, onerror);
}

function getFileEntry(fileEntry, entry, onend, onprogress, onerror, totalSize, checkCrc32) {
  let currentIndex = 0;

  function process(fileEntry, entry, onend, onprogress, onerror, totalSize) {
    let childIndex = 0;

    function addChild(child) {
      function nextChild(childFileEntry) {
        currentIndex += child.uncompressedSize || 0;
        process(childFileEntry, child, function() {
          childIndex++;
          processChild();
        }, onprogress, onerror, totalSize);
      }

      if (child.directory)
        fileEntry.getDirectory(child.name, {
          create: true,
        }, nextChild, onerror);
      else
        fileEntry.getFile(child.name, {
          create: true,
        }, function(file) {
          child.getData(new FileWriter(file, mime.lookup(child.name)), nextChild, function(index) {
            if (onprogress)
              onprogress(currentIndex + index, totalSize);
          }, checkCrc32);
        }, onerror);
    }

    function processChild() {
      const child = entry.children[childIndex];
      if (child)
        addChild(child);
      else
        onend();
    }

    processChild();
  }

  if (entry.directory)
    process(fileEntry, entry, onend, onprogress, onerror, totalSize);
  else
    entry.getData(new FileWriter(fileEntry, mime.lookup(entry.name)), onend, onprogress, checkCrc32);
}

function resetFS(fs) {
  fs.entries = [];
  fs.root = new ZipDirectoryEntry(fs);
}

function bufferedCopy(reader, writer, onend, onprogress, onerror) {
  let chunkIndex = 0;

  function stepCopy() {
    const index = chunkIndex * CHUNK_SIZE;
    if (onprogress)
      onprogress(index, reader.size);
    if (index < reader.size)
      reader.readUint8Array(index, Math.min(CHUNK_SIZE, reader.size - index), function(array) {
        writer.writeUint8Array(new Uint8Array(array), function() {
          chunkIndex++;
          stepCopy();
        });
      }, onerror);
    else
      writer.getData(onend);
  }

  stepCopy();
}

function addChild(parent, name, params, directory) {
  if (parent.directory) {
    return directory ? new ZipDirectoryEntry(parent.fs, name, params, parent) : new ZipFileEntry(parent.fs, name, params, parent);
  }
  throw new Error('Parent entry is not a directory.');
}

function ZipEntry() {
}

ZipEntry.prototype = {
  init(fs, name, params, parent) {
    const that = this;
    if (fs.root && parent && parent.getChildByName(name))
      throw new Error('Entry filename already exists.');
    if (!params)
      params = {};
    that.fs = fs;
    that.name = name;
    that.id = fs.entries.length;
    that.parent = parent;
    that.children = [];
    that.zipVersion = params.zipVersion || 0x14;
    that.uncompressedSize = 0;
    fs.entries.push(that);
    if (parent)
      that.parent.children.push(that);
  },
  getFileEntry(fileEntry, onend, onprogress, onerror, checkCrc32) {
    const that = this;
    initReaders(that, function() {
      getFileEntry(fileEntry, that, onend, onprogress, onerror, getTotalSize(that), checkCrc32);
    }, onerror);
  },
  moveTo(target) {
    const that = this;
    if (target.directory) {
      if (!target.isDescendantOf(that)) {
        if (that != target) {
          if (target.getChildByName(that.name))
            throw new Error('Entry filename already exists.');
          detach(that);
          that.parent = target;
          target.children.push(that);
        }
      } else
        throw new Error('Entry is a ancestor of target entry.');
    } else
      throw new Error('Target entry is not a directory.');
  },
  getFullname() {
    const that = this;
    let fullname = that.name;
    let entry = that.parent;
    while (entry) {
      fullname = (entry.name ? `${entry.name}/` : '') + fullname;
      entry = entry.parent;
    }
    return fullname;
  },
  isDescendantOf(ancestor) {
    let entry = this.parent;
    while (entry && entry.id != ancestor.id)
      entry = entry.parent;
    return !!entry;
  },
};
ZipEntry.prototype.constructor = ZipEntry;

let ZipFileEntryProto;

function ZipFileEntry(fs, name, params, parent) {
  const that = this;
  ZipEntry.prototype.init.call(that, fs, name, params, parent);
  that.Reader = params.Reader;
  that.Writer = params.Writer;
  that.data = params.data;
  if (params.getData) {
    that.getData = params.getData;
  }
}

ZipFileEntry.prototype = ZipFileEntryProto = new ZipEntry();
ZipFileEntryProto.constructor = ZipFileEntry;
ZipFileEntryProto.getData = function(writer, onend, onprogress, onerror) {
  const that = this;
  if (!writer || (writer.constructor == that.Writer && that.data))
    onend(that.data);
  else {
    if (!that.reader)
      that.reader = new that.Reader(that.data, onerror);
    that.reader.init(function() {
      writer.init(function() {
        bufferedCopy(that.reader, writer, onend, onprogress, onerror);
      }, onerror);
    });
  }
};

ZipFileEntryProto.getText = function(onend, onprogress, checkCrc32, encoding) {
  this.getData(new TextWriter(encoding), onend, onprogress, checkCrc32);
};
ZipFileEntryProto.getBlob = function(mimeType, onend, onprogress, checkCrc32) {
  this.getData(new BlobWriter(mimeType), onend, onprogress, checkCrc32);
};
ZipFileEntryProto.getData64URI = function(mimeType, onend, onprogress, checkCrc32) {
  this.getData(new Data64URIWriter(mimeType), onend, onprogress, checkCrc32);
};

let ZipDirectoryEntryProto;

function ZipDirectoryEntry(fs, name, params, parent) {
  const that = this;
  ZipEntry.prototype.init.call(that, fs, name, params, parent);
  that.directory = true;
}

ZipDirectoryEntry.prototype = ZipDirectoryEntryProto = new ZipEntry();
ZipDirectoryEntryProto.constructor = ZipDirectoryEntry;
ZipDirectoryEntryProto.addDirectory = function(name) {
  return addChild(this, name, null, true);
};
ZipDirectoryEntryProto.addText = function(name, text) {
  return addChild(this, name, {
    data: text,
    Reader: TextReader,
    Writer: TextWriter,
  });
};
ZipDirectoryEntryProto.addBlob = function(name, blob) {
  return addChild(this, name, {
    data: blob,
    Reader: BlobReader,
    Writer: BlobWriter,
  });
};
ZipDirectoryEntryProto.addData64URI = function(name, dataURI) {
  return addChild(this, name, {
    data: dataURI,
    Reader: Data64URIReader,
    Writer: Data64URIWriter,
  });
};
ZipDirectoryEntryProto.addFileEntry = function(fileEntry, onend, onerror) {
  addFileEntry(this, fileEntry, onend, onerror);
};
ZipDirectoryEntryProto.addData = function(name, params) {
  return addChild(this, name, params);
};
ZipDirectoryEntryProto.importBlob = function(blob, onend, onerror) {
  this.importZip(new BlobReader(blob), onend, onerror);
};
ZipDirectoryEntryProto.importText = function(text, onend, onerror) {
  this.importZip(new TextReader(text), onend, onerror);
};
ZipDirectoryEntryProto.importData64URI = function(dataURI, onend, onerror) {
  this.importZip(new Data64URIReader(dataURI), onend, onerror);
};
ZipDirectoryEntryProto.exportBlob = function(onend, onprogress, onerror) {
  this.exportZip(new BlobWriter('application/zip'), onend, onprogress, onerror);
};
ZipDirectoryEntryProto.exportText = function(onend, onprogress, onerror) {
  this.exportZip(new TextWriter(), onend, onprogress, onerror);
};
ZipDirectoryEntryProto.exportFileEntry = function(fileEntry, onend, onprogress, onerror) {
  this.exportZip(new FileWriter(fileEntry, 'application/zip'), onend, onprogress, onerror);
};
ZipDirectoryEntryProto.exportData64URI = function(onend, onprogress, onerror) {
  this.exportZip(new Data64URIWriter('application/zip'), onend, onprogress, onerror);
};
ZipDirectoryEntryProto.importZip = function(reader, onend, onerror) {
  const that = this;
  createReader(reader, function(zipReader) {
    zipReader.getEntries(function(entries) {
      entries.forEach(function(entry) {
        let parent = that;
        const path = entry.filename.split('/');
        const name = path.pop();
        path.forEach(function(pathPart) {
          parent = parent.getChildByName(pathPart) || new ZipDirectoryEntry(that.fs, pathPart, null, parent);
        });
        if (!entry.directory)
          addChild(parent, name, {
            data: entry,
            Reader: ZipBlobReader,
          });
      });
      onend();
    });
  }, onerror);
};
ZipDirectoryEntryProto.exportZip = function(writer, onend, onprogress, onerror) {
  const that = this;
  initReaders(that, function() {
    createWriter(writer, function(zipWriter) {
      exportZip(zipWriter, that, function() {
        zipWriter.close(onend);
      }, onprogress, getTotalSize(that));
    }, onerror);
  }, onerror);
};
ZipDirectoryEntryProto.getChildByName = function(name) {
  const that = this;
  for (let childIndex = 0; childIndex < that.children.length; childIndex++) {
    const child = that.children[childIndex];
    if (child.name == name)
      return child;
  }
};

function FS() {
  resetFS(this);
}
FS.prototype = {
  remove(entry) {
    detach(entry);
    this.entries[entry.id] = null;
  },
  find(fullname) {
    const path = fullname.split('/');
    let node = this.root;
    for (let index = 0; node && index < path.length; index++)
      node = node.getChildByName(path[index]);
    return node;
  },
  getById(id) {
    return this.entries[id];
  },
  importBlob(blob, onend, onerror) {
    resetFS(this);
    this.root.importBlob(blob, onend, onerror);
  },
  importText(text, onend, onerror) {
    resetFS(this);
    this.root.importText(text, onend, onerror);
  },
  importData64URI(dataURI, onend, onerror) {
    resetFS(this);
    this.root.importData64URI(dataURI, onend, onerror);
  },
  exportBlob(onend, onprogress, onerror) {
    this.root.exportBlob(onend, onprogress, onerror);
  },
  exportText(onend, onprogress, onerror) {
    this.root.exportText(onend, onprogress, onerror);
  },
  exportFileEntry(fileEntry, onend, onprogress, onerror) {
    this.root.exportFileEntry(fileEntry, onend, onprogress, onerror);
  },
  exportData64URI(onend, onprogress, onerror) {
    this.root.exportData64URI(onend, onprogress, onerror);
  },
};

    ZipDirectoryEntry.prototype.addHttpContent = function(name, URL, useRangeHeader) {
      function addChild(parent, name, params, directory) {
        if (parent.directory) {
          return directory 
            ? new ZipDirectoryEntry(parent.fs, name, params, parent)
            : new ZipFileEntry(parent.fs, name, params, parent);
        }
        throw new Error('Parent entry is not a directory.');
      }

      return addChild(this, name, {
        data: URL,
        Reader: useRangeHeader ? HttpRangeReader : HttpReader,
      });
    };
    ZipDirectoryEntry.prototype.importHttpContent = function(URL, useRangeHeader, onend, onerror) {
      this.importZip(useRangeHeader 
        ? new HttpRangeReader(URL)
        : new HttpReader(URL), onend, onerror);
    };
    FS.prototype.importHttpContent = function(URL, useRangeHeader, onend, onerror) {
      this.entries = [];
      this.root = new ZipDirectoryEntry(this);
      this.root.importHttpContent(URL, useRangeHeader, onend, onerror);
    };

export {
  FS,
  ZipDirectoryEntry,
  ZipFileEntry,
};
