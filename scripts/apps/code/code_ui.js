// scripts/apps/code/code_ui.js
window.CodeUI = (() => {
  "use strict";

  let elements = {};

  function buildAndShow(initialState, callbacks) {
    elements.titleInput = Utils.createElement("input", {
      id: "code-editor-title",
      className: "code-editor-title-input",
      type: "text",
      value: initialState.filePath || "Untitled",
    });

    const saveBtn = UIComponents.createButton("Save & Exit", {
      classes: ["btn--confirm"],
      onClick: () =>
          callbacks.onSave(elements.titleInput.value, elements.textarea.value),
    });
    const exitBtn = UIComponents.createButton("Exit", {
      classes: ["btn--cancel"],
      onClick: () => callbacks.onExit(),
    });

    const header = Utils.createElement(
        "header",
        { className: "code-editor-header" },
        [
          elements.titleInput,
          Utils.createElement("div", { className: "editor-toolbar-group" }, [
            saveBtn,
            exitBtn,
          ]),
        ]
    );

    elements.textarea = Utils.createElement("textarea", {
      id: "code-editor-textarea",
      className: "code-editor-textarea",
      spellcheck: "false",
      autocapitalize: "none",
      textContent: initialState.fileContent || "",
    });

    elements.highlighter = Utils.createElement("pre", {
      id: "code-editor-highlighter",
      className: "code-editor-highlighter",
      "aria-hidden": "true",
    });

    const editorWrapper = Utils.createElement(
        "div",
        {
          className: "code-editor-wrapper",
        },
        [elements.highlighter, elements.textarea]
    );

    const main = Utils.createElement(
        "main",
        { className: "code-editor-main" },
        editorWrapper
    );
    elements.container = Utils.createElement(
        "div",
        {
          id: "code-editor-container",
          className: "code-editor-container",
        },
        [header, main]
    );

    _addEventListeners(callbacks);

    elements.textarea.focus();

    return elements.container;
  }

  function hideAndReset() {
    elements = {};
  }

  function _addEventListeners(callbacks) {
    elements.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        callbacks.onTab(e.target);
      }
    });

    elements.textarea.addEventListener("input", (e) => {
      callbacks.onInput(e.target.value);
    });

    elements.textarea.addEventListener("scroll", () => {
      elements.highlighter.scrollTop = elements.textarea.scrollTop;
      elements.highlighter.scrollLeft = elements.textarea.scrollLeft;
    });

    elements.textarea.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData(
          "text/plain"
      );
      callbacks.onPaste(e.target, pastedText);
    });
  }

  return { buildAndShow, hideAndReset };
})();