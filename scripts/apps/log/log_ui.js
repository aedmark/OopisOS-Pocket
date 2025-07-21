// scripts/apps/log/log_ui.js
window.LogUI = class LogUI {
  constructor(callbacks, dependencies) {
    this.elements = {};
    this.callbacks = callbacks;
    this.dependencies = dependencies;
    this._buildLayout();
  }

  getContainer() {
    return this.elements.container;
  }

  _buildLayout() {
    const { Utils } = this.dependencies;
    this.elements.entryList = Utils.createElement("div", {
      id: "log-entry-list",
      className: "log-app__list-pane",
    });

    this.elements.contentView = Utils.createElement("textarea", {
      id: "log-content-view",
      className: "log-app__content-pane",
      placeholder: "Select an entry to view or edit...",
    });

    this.elements.searchBar = Utils.createElement("input", {
      id: "log-search-bar",
      type: "text",
      placeholder: "Search entries...",
      className: "log-app__search",
    });
    this.elements.newBtn = Utils.createElement("button", {
      id: "log-new-btn",
      textContent: "New Entry",
      className: "log-app__btn",
    });
    this.elements.saveBtn = Utils.createElement("button", {
      id: "log-save-btn",
      textContent: "Save Changes",
      className: "log-app__btn hidden",
    });
    this.elements.exitBtn = Utils.createElement("button", {
      id: "log-exit-btn",
      textContent: "Exit",
      className: "log-app__btn log-app__btn--exit",
    });

    this.elements.searchBar.addEventListener("input", () =>
        this.callbacks.onSearch(this.elements.searchBar.value)
    );
    this.elements.newBtn.addEventListener("click", () => this.callbacks.onNew());
    this.elements.saveBtn.addEventListener("click", () => this.callbacks.onSave());
    this.elements.exitBtn.addEventListener("click", () => this.callbacks.onExit());
    this.elements.contentView.addEventListener("input", () =>
        this.callbacks.onContentChange(this.elements.contentView.value)
    );

    const header = Utils.createElement(
        "header",
        { className: "log-app__header" },
        Utils.createElement("h2", { textContent: "Captain's Log" }),
        this.elements.searchBar,
        Utils.createElement(
            "div",
            { className: "log-app__actions" },
            this.elements.newBtn,
            this.elements.saveBtn,
            this.elements.exitBtn
        )
    );

    const main = Utils.createElement(
        "main",
        { className: "log-app__main" },
        this.elements.entryList,
        this.elements.contentView
    );
    this.elements.container = Utils.createElement(
        "div",
        { id: "log-app-container", className: "log-app__container" },
        header,
        main
    );
  }

  renderEntries(entries, selectedPath) {
    if (!this.elements.entryList) return;
    const { Utils } = this.dependencies;
    this.elements.entryList.innerHTML = "";
    if (entries.length === 0) {
      this.elements.entryList.textContent = "No entries found.";
      return;
    }
    entries.forEach((entry) => {
      const date = new Date(entry.timestamp);
      const title =
          entry.content
              .split("\n")[0]
              .replace(/^#+\s*/, "")
              .substring(0, 40) || "(Untitled)";
      const item = Utils.createElement(
          "div",
          {
            className: "log-app__list-item",
            "data-path": entry.path,
          },
          [
            Utils.createElement("strong", { textContent: date.toLocaleString() }),
            Utils.createElement("span", { textContent: title }),
          ]
      );
      if (entry.path === selectedPath) {
        item.classList.add("selected");
      }
      item.addEventListener("click", () => this.callbacks.onSelect(entry.path));
      this.elements.entryList.appendChild(item);
    });
  }

  renderContent(entry) {
    if (!this.elements.contentView) return;
    if (!entry) {
      this.elements.contentView.value = "";
      this.elements.contentView.placeholder = "Select an entry to view or edit...";
      this.elements.saveBtn.classList.add("hidden");
      return;
    }
    this.elements.contentView.value = entry.content;
  }

  updateSaveButton(isDirty) {
    if (this.elements.saveBtn) {
      this.elements.saveBtn.classList.toggle("hidden", !isDirty);
    }
  }

  getContent() {
    return this.elements.contentView ? this.elements.contentView.value : "";
  }

  reset() {
    this.elements = {};
    this.callbacks = {};
    this.dependencies = {};
  }
}