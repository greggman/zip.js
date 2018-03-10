
import workerConfig from './worker-config';

const CHUNK_SIZE = 512 * 1024;

function Crc32() {
  this.crc = -1;
}
Crc32.prototype.append = function append(data) {
  let crc = this.crc | 0;
  const table = this.table;
  for (let offset = 0, len = data.length | 0; offset < len; offset++) { crc = (crc >>> 8) ^ table[(crc ^ data[offset]) & 0xFF]; }
  this.crc = crc;
};
Crc32.prototype.get = function get() {
  return ~this.crc;
};
Crc32.prototype.table = (function () {
  const table = []; // Uint32Array is actually slower than []
  for (let i = 0; i < 256; i++) {
    let t = i;
    for (let j = 0; j < 8; j++) {
      if (t & 1) { t = (t >>> 1) ^ 0xEDB88320; } else
        {t >>>= 1;}
    }
    table[i] = t;
  }
  return table;
}());

// "no-op" codec
function NOOP() {}
NOOP.prototype.append = function append(bytes, onprogress) {
  return bytes;
};
NOOP.prototype.flush = function flush() {};

/**
   * inflate/deflate core functions
   * @param worker {Worker} web worker for the task.
   * @param initialMessage {Object} initial message to be sent to the worker. should contain
   *   sn(serial number for distinguishing multiple tasks sent to the worker), and codecClass.
   *   This function may add more properties before sending.
   */
function launchWorkerProcess(worker, initialMessage, reader, writer, offset, size, onprogress, onend, onreaderror, onwriteerror) {
  let chunkIndex = 0;
  let index;
  let outputSize;
  const sn = initialMessage.sn;
  let crc;

  function onflush() {
    worker.removeEventListener('message', onmessage, false);
    onend(outputSize, crc);
  }

  function onmessage(event) {
    const message = event.data;
    const data = message.data;
    const err = message.error;
    if (err) {
      err.toString = function () { return `Error: ${this.message}`; };
      onreaderror(err);
      return;
    }
    if (message.sn !== sn) { return; }
    if (typeof message.codecTime === 'number') { worker.codecTime += message.codecTime; } // should be before onflush()
    if (typeof message.crcTime === 'number') { worker.crcTime += message.crcTime; }

    switch (message.type) {
      case 'append':
        if (data) {
          outputSize += data.length;
          writer.writeUint8Array(data, () => {
            step();
          }, onwriteerror);
        } else { step(); }
        break;
      case 'flush':
        crc = message.crc;
        if (data) {
          outputSize += data.length;
          writer.writeUint8Array(data, () => {
            onflush();
          }, onwriteerror);
        } else { onflush(); }
        break;
      case 'progress':
        if (onprogress) { onprogress(index + message.loaded, size); }
        break;
      case 'importScripts': // no need to handle here
      case 'newTask':
      case 'echo':
        break;
      default:
        console.warn('zip.js:launchWorkerProcess: unknown message: ', message);
    }
  }

  function step() {
    index = chunkIndex * CHUNK_SIZE;
    // use `<=` instead of `<`, because `size` may be 0.
    if (index <= size) {
      reader.readUint8Array(offset + index, Math.min(CHUNK_SIZE, size - index), (array) => {
        if (onprogress) { onprogress(index, size); }
        const msg = index === 0 ? initialMessage : { sn };
        msg.type = 'append';
        msg.data = array;

        // posting a message with transferables will fail on IE10
        try {
          worker.postMessage(msg, [array.buffer]);
        } catch (ex) {
          worker.postMessage(msg); // retry without transferables
        }
        chunkIndex++;
      }, onreaderror);
    } else {
      worker.postMessage({
        sn,
        type: 'flush',
      });
    }
  }

  outputSize = 0;
  worker.addEventListener('message', onmessage, false);
  step();
}

function launchProcess(process, reader, writer, offset, size, crcType, onprogress, onend, onreaderror, onwriteerror) {
  let chunkIndex = 0;
  let index;
  let outputSize = 0;
  const crcInput = crcType === 'input';
  const crcOutput = crcType === 'output';
  const crc = new Crc32();
  function step() {
    let outputData;
    index = chunkIndex * CHUNK_SIZE;
    if (index < size) {
      reader.readUint8Array(offset + index, Math.min(CHUNK_SIZE, size - index), (inputData) => {
        let outputData;
        try {
          outputData = process.append(inputData, (loaded) => {
              if (onprogress)
                onprogress(index + loaded, size);
            });
        } catch (e) {
          onreaderror(e);
          return;
        }
        if (outputData) {
          outputSize += outputData.length;
          writer.writeUint8Array(outputData, () => {
              chunkIndex++;
              setTimeout(step, 1);
            }, onwriteerror);
          if (crcOutput)
            {crc.append(outputData);}
        } else {
          chunkIndex++;
          setTimeout(step, 1);
        }
        if (crcInput)
          {crc.append(inputData);}
        if (onprogress)
          {onprogress(index, size);}
      }, onreaderror); 
    } else {
      try {
        outputData = process.flush();
      } catch (e) {
        onreaderror(e);
        return;
      }
      if (outputData) {
        if (crcOutput) { crc.append(outputData); }
        outputSize += outputData.length;
        writer.writeUint8Array(outputData, () => {
          onend(outputSize, crc.get());
        }, onwriteerror);
      } else { onend(outputSize, crc.get()); }
    }
  }

  step();
}

function inflate(worker, sn, reader, writer, offset, size, computeCrc32, onend, onprogress, onreaderror, onwriteerror) {
  const crcType = computeCrc32 ? 'output' : 'none';
  if (workerConfig.useWebWorkers) {
    const initialMessage = {
      sn,
      codecClass: 'Inflater',
      crcType,
    };
    launchWorkerProcess(worker, initialMessage, reader, writer, offset, size, onprogress, onend, onreaderror, onwriteerror);
  } else { 
    // FIX/TODO: figure out how to set this dynamically
    launchProcess(new (window).Inflater(), reader, writer, offset, size, crcType, onprogress, onend, onreaderror, onwriteerror);
  }
}

function deflate(worker, sn, reader, writer, level, onend, onprogress, onreaderror, onwriteerror) {
  const crcType = 'input';
  if (workerConfig.useWebWorkers) {
    const initialMessage = {
      sn,
      options: { level },
      codecClass: 'Deflater',
      crcType,
    };
    launchWorkerProcess(worker, initialMessage, reader, writer, 0, reader.size, onprogress, onend, onreaderror, onwriteerror);
  } else {
    // FIX/TODO: figure out how to set this dynamically
    launchProcess(new (window).Deflater(), reader, writer, 0, reader.size, crcType, onprogress, onend, onreaderror, onwriteerror);
  }
}

function copy(worker, sn, reader, writer, offset, size, computeCrc32, onend, onprogress, onreaderror, onwriteerror) {
  const crcType = 'input';
  if (workerConfig.useWebWorkers && computeCrc32) {
    const initialMessage = {
      sn,
      codecClass: 'NOOP',
      crcType,
    };
    launchWorkerProcess(worker, initialMessage, reader, writer, offset, size, onprogress, onend, onreaderror, onwriteerror);
  } else {
    launchProcess(new NOOP(), reader, writer, offset, size, crcType, onprogress, onend, onreaderror, onwriteerror);
  }
}

export {
  inflate,
  deflate,
  copy,
};
