// scripts/ui_components.js
const UIComponents = (() => {
  "use strict";

  function createAppHeader(title, onExit) {
    const { Utils } = dependencies;
    const exitBtn = Utils.createElement("button", {
      className: "btn btn--cancel",
      textContent: "Exit",
      eventListeners: { click: onExit },
    });
    const titleElement = Utils.createElement("h2", { textContent: title });
    return Utils.createElement(
        "header",
        { className: "app-header" }, // A generic class for styling
        [titleElement, exitBtn]
    );
  }

  function createButton(text, options = {}) {
    const { Utils } = dependencies;
    const { onClick, classes = [], id = null, title = null } = options;
    const btnClasses = ["btn", ...classes];
    const attributes = {
      className: btnClasses.join(" "),
      textContent: text,
    };
    if (id) attributes.id = id;
    if (title) attributes.title = title;
    if (onClick) attributes.eventListeners = { click: onClick };

    return Utils.createElement("button", attributes);
  }

  return {
    createAppHeader,
    createButton,
  };
})();