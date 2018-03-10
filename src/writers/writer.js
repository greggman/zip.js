function Writer() {
}
Writer.prototype.getData = function (callback) {
  callback(this.data);
};

export {
  Writer as default,
};
