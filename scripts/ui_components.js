// scripts/ui_components.js
class UIComponents {
  constructor() {
    this.dependencies = {};
  }

  setDependencies(dependencies) {
    this.dependencies = dependencies;
  }

  createAppHeader(title, onExit) {
    const { Utils } = this.dependencies;
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

  createButton(text, options = {}) {
    const { Utils } = this.dependencies;
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
}