const ERR_BAD_FORMAT = 'File format is not recognized.';
const ERR_CRC = 'CRC failed.';
const ERR_ENCRYPTED = 'File contains encrypted entry.';
const ERR_ZIP64 = 'File is using Zip64 (4gb+ file size).';
const ERR_READ = 'Error while reading zip file.';
const ERR_WRITE = 'Error while writing zip file.';
const ERR_WRITE_DATA = 'Error while writing file data.';
const ERR_READ_DATA = 'Error while reading file data.';
const ERR_DUPLICATED_NAME = 'File already exists.';

export {
  ERR_BAD_FORMAT,
  ERR_CRC,
  ERR_ENCRYPTED,
  ERR_ZIP64,
  ERR_READ,
  ERR_WRITE,
  ERR_WRITE_DATA,
  ERR_READ_DATA,
  ERR_DUPLICATED_NAME,
};
