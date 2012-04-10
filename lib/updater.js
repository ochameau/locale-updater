/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci, Cu, components } = require("chrome");
const { NetUtil } = Cu.import("resource://gre/modules/NetUtil.jsm");
const ios = Components.classes["@mozilla.org/network/io-service;1"].
            getService(Components.interfaces.nsIIOService);

// Read a .properties file (nsIFile instance), and returns
// a JSON object containing key/values of the given file.
// (The .properties file should be in UTF-8 without BOM)
exports.readPropertiesFile = function readPropertiesFile(file) {
  let channel = ios.newChannelFromURI(ios.newFileURI(file, null, null));
  let stream = channel.open();
  let properties = Cc["@mozilla.org/persistent-properties;1"].
                   createInstance(Ci.nsIPersistentProperties);
  properties.load(stream);
  stream.close();

  let json = {};
  let enumerate = properties.enumerate();
  while(enumerate.hasMoreElements()) {
    let property = enumerate.getNext().QueryInterface(Ci.nsIPropertyElement);
    json[property.key] = property.value;
  }
  return json;
}

/**
 * Fetch locales data from an addon (`xpiFile`, an nsIFile instance).
 * `callback` is called with following data:
 * {
 *   manifest: { // content of locales.json 
 *     locales: ["en-US", "fr", ...]
 *   },
 *   locales: { // content of 'locale/*.properties' files
 *     "en-US": {
 *       "key": "value", ...
 *     },
 *     "fr": {
 *       "key": "valeur", ...
 *     },
 *     ...
 *   }
 * }
 */
exports.readAddon = function (xpiFile, callback) {
  let zipR = Cc["@mozilla.org/libjar/zip-reader;1"].
             createInstance(Ci.nsIZipReader);
  zipR.open(xpiFile);

  // Read manifest
  if (!zipR.hasEntry("locales.json"))
    throw new Error("No `locales.json` manifest file in "+xpiFile);
  let zis = zipR.getInputStream("locales.json");
  let data = NetUtil.readInputStreamToString(zis, zis.available());
  let manifest = JSON.parse( data );

  // Read .json files in locale/ folder
  let locales = {};
  for each(let locale in manifest.locales) {
    let path = "locale/" + locale + ".json";
    if (!zipR.hasEntry(path)) {
      console.warn("No json file for locale: " + locale);
      continue;
    }
    let zis = zipR.getInputStream(path);
    let data = NetUtil.readInputStreamToString(zis, zis.available());
    locales[locale] = JSON.parse( data );
  }
  zipR.close();
  
  callback({
    manifest: manifest,
    locales: locales
  });
}

function streamForData(data) {
  let stream = Cc["@mozilla.org/io/string-input-stream;1"].
               createInstance(Ci.nsIStringInputStream);
  stream.setData(data, -1);
  return stream;
}

/**
 * Update a given xpi file (nsIFile instance), with localization key/values 
 * passed into `properties`. `properties` is an hashmap whose key are locale
 * name, and values are another hashes with key/value to translate.
 * `callback` is called when the xpi is updated.
 */
exports.update = function update(xpiFile, properties, callback) {
  exports.readAddon(xpiFile, function (addon) {
    let zipW = Cc["@mozilla.org/zipwriter;1"].
               createInstance(Ci.nsIZipWriter);
    zipW.open(xpiFile, 0x04 /* PR_RDWR */);

    // Register new locales in manifest
    let manifest = addon.manifest;
    let updateManifest = false;
    for(var locale in properties) {
      if (manifest.locales.indexOf(locale) == -1) {
        manifest.locales.push(locale);
        updateManifest = true;
      }
    }
    if (updateManifest) {
      let locales = streamForData(JSON.stringify(manifest));
      if (zipW.hasEntry("locales.json"))
        zipW.removeEntry("locales.json", false);
      zipW.addEntryStream("locales.json", 0, Ci.nsIZipWriter.COMPRESSION_NONE,
                          locales, false);
    }

    // Add/Update locales
    for(var locale in properties) {
      // Get existing strings map from the addon
      let map = addon.locales[locale] || {};
      // Inject new/updated keys
      let newMap = properties[locale];
      for(var key in newMap)
        map[key] = newMap[key];
      let stream = streamForData(JSON.stringify(map));
      let path = "locale/" + locale + ".json";
      if (zipW.hasEntry(path))
        zipW.removeEntry(path, false);
      zipW.addEntryStream(path, 0,
                          Ci.nsIZipWriter.COMPRESSION_NONE,
                          stream, false);
    }
    zipW.close();
    callback(true);
  });
}
