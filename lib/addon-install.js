/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci, Cu } = require('chrome');
const { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm");

/**
 * Immediatly install an addon.
 *
 * @param {String} xpiPath
 *   file path to an xpi file to install
 * @param {Function} callback
 *   function called when addon install finished. First argument being a
 *   boolean to say if the installation was successfull
 */
exports.install = function install(xpiPath, callback) {
  // Listen for installation end
  let listener = {
    onInstallEnded: function(aInstall, aAddon) {

      onInstalled(aInstall, true, aAddon.id);
    },
    onInstallFailed: function (aInstall) {
      onInstalled(aInstall, false, null);
    }
  };
  function onInstalled(aInstall, success, addonId) {
    aInstall.removeListener(listener);
    if (typeof callback === "function")
      callback(success, addonId);
  }

  // Create nsIFile for the xpi file
  let file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
  file.initWithPath(xpiPath);

  // Order AddonManager to install the addon
  AddonManager.getInstallForFile(file, function(install) {
    install.addListener(listener);
    install.install();
  });
};

exports.uninstall = function uninstall(addonId, callback) {
  // Listen for uninstallation end
  let listener = {
    onUninstalled: function onUninstalled(aAddon) {
      if (aAddon.id != addonId)
        return;
      AddonManager.removeAddonListener(listener);
      if (typeof callback === "function")
        callback();
    }
  };
  AddonManager.addAddonListener(listener);

  // Order Addonmanager to uninstall the addon
  AddonManager.getAddonByID(addonId, function (addon) {
    addon.uninstall();
  });
};

exports.disable = function disable(addonId, callback) {
  AddonManager.getAddonByID(addonId, function (addon) {
    addon.userDisabled = true;
    if (typeof callback === "function")
      callback();
  });
};
