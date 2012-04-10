const { Cc, Ci, Cu, components } = require("chrome");
const { NetUtil } = Cu.import("resource://gre/modules/NetUtil.jsm");
const { FileUtils } = Cu.import("resource://gre/modules/FileUtils.jsm");

// Exposed an augmented version of `FileUtils` jsm module
let exports = module.exports = Object.create(FileUtils);

exports.copyURLToFile = function copyURLToFile(src, dst, callback) {
  let channel = NetUtil.newChannel(src);
  let output = FileUtils.openSafeFileOutputStream(dst);
  NetUtil.asyncFetch(channel, function(input, status) {  
    if (!components.isSuccessCode(status)) {  
      callback(false, status);
      return;
    }
    NetUtil.asyncCopy(input, output, function () {
      input.close();
      output.close();
      callback(true);
    });
  });
}

exports.getTmpFile = function getTmpFile(name, ext) {
  let tmpFilename = name + "-" + (new Date().getTime()) + "." + ext;
  return FileUtils.getFile("TmpD", [tmpFilename]);
}

exports.copyFile = function copyFile(src, dst, callback) {
  let output = FileUtils.openSafeFileOutputStream(dst);
  NetUtil.asyncFetch(src, function(input, status) {  
    if (!components.isSuccessCode(status)) {  
      callback(false, status);
      return;
    }
    NetUtil.asyncCopy(input, output, function () {
      input.close();
      output.close();
      callback(true);
    });
  });
}

exports.writeString = function writeStringToFile(file, data, callback) {
  var ostream = FileUtils.openSafeFileOutputStream(file);

  var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].  
                  createInstance(Ci.nsIScriptableUnicodeConverter);  
  converter.charset = "UTF-8";
  var istream = converter.convertToInputStream(data);

  NetUtil.asyncCopy(istream, ostream, function(status) {  
    if (!components.isSuccessCode(status)) {  
      callback(false, status);
      return;  
    }
    callback(true);
  });
}
