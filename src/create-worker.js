
import workerConfig from './worker-config';

function resolveURLs(urls) {
  const a = document.createElement('a');
  return urls.map((url) => {
    a.href = url;
    return a.href;
  });
}

const DEFAULT_WORKER_SCRIPTS = {
  deflater: ['z-worker.js', 'deflate.js'],
  inflater: ['z-worker.js', 'inflate.js'],
};
function createWorker(type, callback, onerror) {
  if (workerConfig.workerScripts !== null && workerConfig.workerScriptsPath !== null) {
    onerror(new Error('Either zip.workerScripts or zip.workerScriptsPath may be set, not both.'));
    return;
  }
  let scripts;
  if (workerConfig.workerScripts) {
    scripts = workerConfig.workerScripts[type];
    if (!Array.isArray(scripts)) {
      onerror(new Error(`zip.workerScripts.${type} is not an array!`));
      return;
    }
    scripts = resolveURLs(scripts);
  } else {
    scripts = DEFAULT_WORKER_SCRIPTS[type].slice(0);
    scripts[0] = (workerConfig.workerScriptsPath || '') + scripts[0];
  }
  const worker = new Worker(scripts[0]);
  // record total consumed time by inflater/deflater/crc32 in this worker
  worker.codecTime = worker.crcTime = 0;
  worker.postMessage({ type: 'importScripts', scripts: scripts.slice(1) });
  worker.addEventListener('message', onmessage);
  function onmessage(ev) {
    const msg = ev.data;
    if (msg.error) {
      worker.terminate(); // should before onerror(), because onerror() may throw.
      onerror(msg.error);
      return;
    }
    if (msg.type === 'importScripts') {
      worker.removeEventListener('message', onmessage);
      worker.removeEventListener('error', errorHandler);
      callback(worker);
    }
  }
  // catch entry script loading error and other unhandled errors
  worker.addEventListener('error', errorHandler);
  function errorHandler(err) {
    worker.terminate();
    onerror(err);
  }
}

export {
  createWorker as default,
};
