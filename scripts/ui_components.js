// scripts/ui_components.js
class UIComponents {
  constructor() {
    this.dependencies = {};
  }

  setDependencies(dependencies) {
    this.dependencies = dependencies;
  }

  createAppWindow(title, onExit, options = {}) {
    const { Utils } = this.dependencies;

    const exitBtn = this.createButton({
      text: '×',
      title: 'Exit Application (Esc)',
      classes: ['app-header__exit-btn'],
      onClick: onExit
    });

    const header = Utils.createElement('header', { className: 'app-header' }, [
      Utils.createElement('h2', { className: 'app-header__title', textContent: title }),
      exitBtn
    ]);

    const main = Utils.createElement('main', { className: 'app-main' });
    const footer = Utils.createElement('footer', { className: 'app-footer' });

    const container = Utils.createElement('div', {
      id: `${title.toLowerCase().replace(/\\s+/g, '-')}-app-container`,
      className: 'app-container' // A new, standard class for all apps
    }, [header, main, footer]);

    return { container, header, main, footer };
  }

  createButton(options = {}) {
    const { Utils } = this.dependencies;
    const { text, onClick, classes = [], id = null, title = null, icon = null } = options;
    const btnClasses = ["btn", ...classes];

    const content = [];
    if (icon) {
      content.push(Utils.createElement('span', { className: 'btn-icon', textContent: icon }));
    }
    if (text) {
      content.push(document.createTextNode(text));
    }

    const attributes = {
      className: btnClasses.join(" "),
    };
    if (id) attributes.id = id;
    if (title) attributes.title = title;
    if (onClick) attributes.eventListeners = { click: onClick };

    return Utils.createElement("button", attributes, content);
  }
}