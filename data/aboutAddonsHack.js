function onUpdateBtnClick(event) {
  let btn = event.target;
  self.port.emit("update-locale", btn.addonId, btn.xpiURI);
}

function hackAddonList() {
  let list = document.getElementById("addon-list");

  for(let i = 0; i < list.childNodes.length; i++) {
    let item = list.childNodes[i];
    let addon = item.mAddon;
    if (addon.type !== "extension")
      continue;
    if (!addon.isActive)
      continue;
    // Only target Jetpack addons
    if (!addon.hasResource("harness-options.json"))
      continue;

    // Search for the container of buttons displayed at right of the addon line
    let controlContainer = document.getAnonymousElementByAttribute(item, 'anonid', 'control-container');

    // Insert our button only once
    if (controlContainer.querySelectorAll("button.update-locale").length > 0)
      continue;

    // Inject our own button here
    let btn = document.createElement("button");
    btn.setAttribute("class", "addon-control update-locale");
    btn.setAttribute("label", "Update l10n");
    btn.addonId = addon.id;
    btn.xpiURI = addon.getResourceURI("").spec;
    btn.addEventListener("command", onUpdateBtnClick, false);
    controlContainer.insertBefore(btn, controlContainer.firstChild);
  }

}

document.addEventListener("ViewChanged", hackAddonList, true);
