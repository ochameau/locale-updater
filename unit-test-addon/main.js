/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci } = require("chrome");
const _ = require("l10n").get;

const observerService = Cc["@mozilla.org/observer-service;1"].
                        getService(Ci.nsIObserverService);

let message = _("translated") + " " + _("untranslated");

observerService.notifyObservers(
  null,
  "unit-test-addon",
  message);
