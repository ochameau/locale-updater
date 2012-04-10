const updater = require("updater");
const FileUtils2 = require("FileUtils2");
const { Cc, Ci, Cu } = require("chrome");
let { setTimeout } = require("timer");
const AddonInstall = require("addon-install");

// Locale modifier util
const prefs = require("preferences-service");
const PREF_MATCH_OS_LOCALE  = "intl.locale.matchOS";
const PREF_SELECTED_LOCALE  = "general.useragent.locale";
function setLocale(locale) {
  prefs.set(PREF_MATCH_OS_LOCALE, false);
  prefs.set(PREF_SELECTED_LOCALE, locale);
}
function resetLocale() {
  prefs.reset(PREF_MATCH_OS_LOCALE);
  prefs.reset(PREF_SELECTED_LOCALE);
}

// Listen to message sent from the test addon
let messageListener = null;
const observerService = Cc["@mozilla.org/observer-service;1"].
                        getService(Ci.nsIObserverService);
observerService.addObserver({
  observe: function (subject, topic, data) {
    if (messageListener) {
      messageListener(data);
      messageListener = null;
    }
  }
}, "unit-test-addon", false);

// Small utility function that allows to get an nsIFile instance for a given
// file from data folder. As xpi are now packed, files from data folders
// can only be accessed by URI. So we copy the file to a temporary file
// and give a nsIFile instance for it.
function getTmpFileForData(path, callback) {
  let uri = require("self").data.url(path);
  let ext = path.match(/\.(.+)$/)[1];
  let file = FileUtils2.getTmpFile("tmp-test", ext);
  FileUtils2.copyURLToFile(uri, file, function () {
    callback(file);
  });
}

exports.testReadProperties = function (test) {
  test.waitUntilDone();

  let expected = {
    translated: "updated value",
    untranslated: "new vâlüe"
  };
  getTmpFileForData("xx_YY.properties", function (file) {
    let properties = updater.readPropertiesFile(file);
    file.remove(false);
    test.assertEqual(JSON.stringify(properties),
                     JSON.stringify(expected),
                     ".properties file is correctly read");
    test.done();
  });
}

exports.testReadAddon = function(test) {
  test.waitUntilDone();

  getTmpFileForData("unit-test-addon.xpi", function (tmpFile) {
    updater.readAddon(tmpFile, function (addon) {
      // Just check that xx_YY is here
      // (there is many others stuff coming from addon-kit/api-utils)
      test.assert(addon.manifest.locales.indexOf("xx_YY") != -1);
      let locale = { translated: "xx_YY" };
      test.assertEqual(JSON.stringify(addon.locales.xx_YY),
                       JSON.stringify(locale),
                       "locales are properly fetched");
      tmpFile.remove(false);
      test.done();
    });
  });
}

function next(test) {
  // Bug 719185: Have to GC in order to work aroung bug:
  // "Failed to remove trash directory when installing unit-test-addon@jetpack:
  // Component returned failure code: 0x80520015
  // (NS_ERROR_FILE_ACCESS_DENIED) [nsIFile.remove]
  // resource:///modules/XPIProvider.jsm :: recursiveRemove :: line 1233
  Cu.forceGC();
  test.done();
}

exports.testInstall = function(test) {
  test.waitUntilDone();

  setLocale("xx_YY");

  getTmpFileForData("unit-test-addon.xpi", function (tmpFile) {
    let installCallbackCalled = false;
    messageListener = function (message) {
      test.assertEqual(message, "xx_YY untranslated", "Got xx_YY locale message");
      test.assert(installCallbackCalled, "install callback has been called");

      tmpFile.remove(false);
      resetLocale();
      
      next(test);
    };
    AddonInstall.install(tmpFile.path, function () {
      installCallbackCalled = true;
    });
  });
}

// Inject a brand new .properties file to the addon
exports.testNewLocale = function(test) {
  test.waitUntilDone();

  setLocale("aa_BB");

  let properties = {
    aa_BB: {
      translated: "aa_BB"
    }
  };
  getTmpFileForData("unit-test-addon.xpi", function (tmpFile) {
    updater.update(tmpFile, properties, function () {
      let installCallbackCalled = false;
      messageListener = function (message) {
        test.assertEqual(message, "aa_BB untranslated", "New locale works");

        tmpFile.remove(false);
        resetLocale();
        next(test);
      };
      AddonInstall.install(tmpFile.path);
    });
  });
}

// Modifify an existing .properties file
exports.testUpdatedLocale = function(test) {
  test.waitUntilDone();

  setLocale("xx_YY");

  let properties = {
    xx_YY: {
      // Update a key
      translated: "updated value",
      // Translate a new one, previously untranslated
      untranslated: "new vâlüe"
    }
  };
  getTmpFileForData("unit-test-addon.xpi", function (tmpFile) {
    updater.update(tmpFile, properties, function () {
      let installCallbackCalled = false;
      messageListener = function (message) {
        test.assertEqual(message,
                         properties.xx_YY.translated + " " +
                         properties.xx_YY.untranslated,
                         "Existing locale has been updated");

        tmpFile.remove(false);
        resetLocale();
        test.done();
      };
      AddonInstall.install(tmpFile.path);
    });
  });
}
