// scripts/apps/code/code_ui.js
window.CodeUI = class CodeUI {
  constructor(initialState, callbacks, dependencies) {
    this.elements = {};
    this.callbacks = callbacks;
    this.dependencies = dependencies;
    this._buildAndShow(initialState);
  }

  getContainer() {
    return this.elements.container;
  }

  _buildAndShow(initialState) {
    const { Utils, UIComponents } = this.dependencies;

    this.elements.titleInput = Utils.createElement("input", {
      id: "code-editor-title",
      className: "code-editor-title-input",
      type: "text",
      value: initialState.filePath || "Untitled",
    });

    const saveBtn = UIComponents.createButton("Save & Exit", {
      classes: ["btn--confirm"],
      onClick: () =>
          this.callbacks.onSave(this.elements.titleInput.value, this.elements.textarea.value),
    });
    const exitBtn = UIComponents.createButton("Exit", {
      classes: ["btn--cancel"],
      onClick: () => this.callbacks.onExit(),
    });

    const header = Utils.createElement(
        "header",
        { className: "code-editor-header" },
        [
          this.elements.titleInput,
          Utils.createElement("div", { className: "editor-toolbar-group" }, [
            saveBtn,
            exitBtn,
          ]),
        ]
    );

    this.elements.textarea = Utils.createElement("textarea", {
      id: "code-editor-textarea",
      className: "code-editor-textarea",
      spellcheck: "false",
      autocapitalize: "none",
      textContent: initialState.fileContent || "",
    });

    this.elements.highlighter = Utils.createElement("pre", {
      id: "code-editor-highlighter",
      className: "code-editor-highlighter",
      "aria-hidden": "true",
    });

    const editorWrapper = Utils.createElement(
        "div",
        {
          className: "code-editor-wrapper",
        },
        [this.elements.highlighter, this.elements.textarea]
    );

    const main = Utils.createElement(
        "main",
        { className: "code-editor-main" },
        editorWrapper
    );
    this.elements.container = Utils.createElement(
        "div",
        {
          id: "code-editor-container",
          className: "code-editor-container",
        },
        [header, main]
    );

    this._addEventListeners();

    this.elements.textarea.focus();
  }

  hideAndReset() {
    this.elements = {};
    this.callbacks = {};
    this.dependencies = {};
  }

  _addEventListeners() {
    this.elements.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        this.callbacks.onTab(e.target);
      }
    });

    this.elements.textarea.addEventListener("input", (e) => {
      this.callbacks.onInput(e.target.value);
    });

    this.elements.textarea.addEventListener("scroll", () => {
      this.elements.highlighter.scrollTop = this.elements.textarea.scrollTop;
      this.elements.highlighter.scrollLeft = this.elements.textarea.scrollLeft;
    });

    this.elements.textarea.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData(
          "text/plain"
      );
      this.callbacks.onPaste(e.target, pastedText);
    });
  }

  highlight(content) {
    if (this.elements.highlighter) {
      this.elements.highlighter.innerHTML = DOMPurify.sanitize(content);
    }
  }
}