const workerConfig = {
  useWebWorkers: true,
  /**
     * Directory containing the default worker scripts (z-worker.js, deflate.js, and inflate.js), relative to current base url.
     * E.g.: zip.workerScripts = './';
     */
  workerScriptsPath: null,
  /**
     * Advanced option to control which scripts are loaded in the Web worker. If this option is specified, then workerScriptsPath must not be set.
     * workerScripts.deflater/workerScripts.inflater should be arrays of urls to scripts for deflater/inflater, respectively.
     * Scripts in the array are executed in order, and the first one should be z-worker.js, which is used to start the worker.
     * All urls are relative to current base url.
     * E.g.:
     * zip.workerScripts = {
     *   deflater: ['z-worker.js', 'deflate.js'],
     *   inflater: ['z-worker.js', 'inflate.js']
     * };
     */
  workerScripts: null,
 };

 export {
   workerConfig as default,
 };
