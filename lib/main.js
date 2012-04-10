/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci, Cu } = require("chrome");
const { ChromeMod } = require("chrome-mod");
const FileUtils2 = require("FileUtils2");
const AddonInstall = require("addon-install");
const updater = require("updater");
const nsIFilePicker = Ci.nsIFilePicker;


function updateLocale(addonId, xpiURI) {
  let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  let window = require("window-utils").activeBrowserWindow;
  fp.init(window, "Select .properties file(s) to inject",
          nsIFilePicker.modeOpenMultiple);
  fp.appendFilter(".properties file(s)", "*.properties");
  fp.show();
  let files = fp.files;
  let properties = {};
  while (files.hasMoreElements()) {
    let file = files.getNext().QueryInterface(Ci.nsILocalFile);
    let locale = file.leafName.replace(/\.properties$/, "");
    properties[locale] = updater.readPropertiesFile(file);
  }
  if (properties.length == 0)
    return;

  let tmpXPIFile = FileUtils2.getTmpFile("test", "xpi");
  FileUtils2.copyURLToFile(xpiURI, tmpXPIFile, function () {
    updater.update(tmpXPIFile, properties, function () {
      AddonInstall.install(tmpXPIFile.path, function () {
        tmpXPIFile.remove(false);
      });
    });
  });
}

ChromeMod({
  include: "about:addons",
  contentScriptFile: require("self").data.url("aboutAddonsHack.js"),
  onAttach: function (worker) {
    worker.port.on("update-locale", updateLocale)
  }
});

require("tabs").open("about:addons");
