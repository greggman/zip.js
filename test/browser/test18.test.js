import mime from 'mime-types';
import {assert} from 'chai';
import zip from '../../src/zip';
import setZipConfig from './config';

describe('Demo ArrayBuffer', () => {

  let resolve;
  let reject;

  it('should hande ArrayBuffer', async () => {
    setZipConfig();
    return new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
      test();
    });
  });

  const TEXT_CONTENT = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Nam liber tempor cum soluta nobis eleifend option congue nihil imperdiet doming id quod mazim placerat facer possim assum. Typi non habent claritatem insitam; est usus legentis in iis qui facit eorum claritatem. Investigationes demonstraverunt lectores legere me lius quod ii legunt saepius. Claritas est etiam processus dynamicus, qui sequitur mutationem consuetudium lectorum. Mirum est notare quam littera gothica, quam nunc putamus parum claram, anteposuerit litterarum formas humanitatis per seacula quarta decima et quinta decima. Eodem modo typi, qui nunc nobis videntur parum clari, fiant sollemnes in futurum.';
  const FILENAME = 'lorem.txt';

  function zipArrayBuffer(arrayBuffer, callback) {
    zip.createWriter(new zip.ArrayBufferWriter(), function(zipWriter) {
      zipWriter.add(FILENAME, new zip.ArrayBufferReader(arrayBuffer), function() {
        zipWriter.close(callback);
      });
    }, reject);
  }

  function unzipArrayBuffer(arrayBuffer, callback) {
    zip.createReader(new zip.ArrayBufferReader(arrayBuffer), function(zipReader) {
      zipReader.getEntries(function(entries) {
        entries[0].getData(new zip.ArrayBufferWriter(), function(data) {
          zipReader.close();
          callback(data);
        });
      });
    }, reject);
  }

  function compare(a, b) {
    assert.strictEqual(a.length, b.length);
    for (let i = 0; i < a.length; ++i) {
      assert.strictEqual(a[i], b[i]);
    }
  }

  function test() {
    const arrayBuffer = new Uint8Array(Array.prototype.map.call(TEXT_CONTENT, function(c) {
      return c.charCodeAt(0);
    })).buffer;
    zipArrayBuffer(arrayBuffer, function(zippedArrayBuffer) {
      unzipArrayBuffer(zippedArrayBuffer, function(unzippedArrayBuffer) {
        compare(
          new Uint8Array(unzippedArrayBuffer),
          new Uint8Array(arrayBuffer)
        );
        resolve();
      });
    });
  }
});
