function getDataHelper(byteLength, bytes) {
  const dataBuffer = new ArrayBuffer(byteLength);
  const dataArray = new Uint8Array(dataBuffer);
  if (bytes) { dataArray.set(bytes, 0); }
  return {
    buffer: dataBuffer,
    array: dataArray,
    view: new DataView(dataBuffer),
  };
}

export {
  getDataHelper,  // eslint-disable-line
};
