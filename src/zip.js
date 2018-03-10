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
import Reader from './readers/reader';
import Writer from './writers/writer';
import BlobReader from './readers/blob-reader';
import BlobWriter from './writers/blob-writer';
import FSReader from './readers/fs-reader';
import TextReader from './readers/text-reader';
import TextWriter from './writers/text-writer';
import Data64URIReader from './readers/deta-64-uri-reader';
import Data64URIWriter from './writers/data-64-uri-writer';
import HttpReader from './readers/http-reader';
import HttpRangeReader from './readers/http-range-reader';
import ArrayBufferReader from './readers/array-buffer-reader';
import FileWriter from './writers/file-writer';
import ArrayBufferWriter from './writers/array-view-writer';
import {getDataHelper} from './utils';
import createReader from './create-reader';
import createWriter from './create-writer';
import workerConfig from './worker-config';
import {FS, ZipDirectoryEntry, ZipFileEntry} from './zip-fs';

const zip = {
  Reader,
  Writer,
  ArrayBufferReader,
  BlobReader,
  Data64URIReader,
  TextReader,
  HttpReader,
  HttpRangeReader,
  BlobWriter,
  Data64URIWriter,
  TextWriter,
  FileWriter,
  ArrayBufferWriter,
  createReader,
  createWriter,
 
  fs: {
    FS, 
    ZipDirectoryEntry, 
    ZipFileEntry,
  },

  config: (...args) => {
    Object.assign(workerConfig, ...args);
  },
};

export { zip as default };
