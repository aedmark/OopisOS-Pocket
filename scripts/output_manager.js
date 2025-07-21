// scripts/output_manager.js
const OutputManager = (() => {
  "use strict";

  let isEditorActive = false;
  let cachedOutputDiv = null;
  let cachedInputLineContainerDiv = null;

  let dependencies = {};

  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  function initialize(dom) {
    cachedOutputDiv = dom.outputDiv;
    cachedInputLineContainerDiv = dom.inputLineContainerDiv;
  }

  function setDependencies(injectedDependencies) {
    dependencies = injectedDependencies;
  }

  function setEditorActive(status) {
    isEditorActive = status;
  }

  async function appendToOutput(text, options = {}) {
    // This check is now safe because dependencies are injected before this is called.
    const { Config, TerminalUI, Utils } = dependencies;
    if (
        isEditorActive &&
        options.typeClass !== Config.CSS_CLASSES.EDITOR_MSG &&
        !options.isCompletionSuggestion
    )
      return;
    if (!cachedOutputDiv) {
      originalConsoleError(
          "OutputManager.appendToOutput: cachedOutputDiv is not defined. Message:",
          text
      );
      return;
    }
    const { typeClass = null, isBackground = false } = options;

    if (
        isBackground &&
        cachedInputLineContainerDiv &&
        !cachedInputLineContainerDiv.classList.contains(Config.CSS_CLASSES.HIDDEN)
    ) {
      const promptText = TerminalUI.getPromptText() || "> ";

      const currentInputVal = TerminalUI.getCurrentInputValue();
      const echoLine = Utils.createElement("div", {
        className: Config.CSS_CLASSES.OUTPUT_LINE,
        textContent: `${promptText}${currentInputVal}`,
      });
      cachedOutputDiv.appendChild(echoLine);
    }

    const lines = String(text).split("\n");
    const fragment = document.createDocumentFragment();

    for (const line of lines) {
      const lineClasses = Config.CSS_CLASSES.OUTPUT_LINE.split(" ");
      const lineAttributes = {
        classList: [...lineClasses],
        textContent: line,
      };

      if (typeClass) {
        typeClass.split(" ").forEach((cls) => {
          if (cls) lineAttributes.classList.push(cls);
        });
      }

      fragment.appendChild(Utils.createElement("div", lineAttributes));
    }

    cachedOutputDiv.appendChild(fragment);
    cachedOutputDiv.scrollTop = cachedOutputDiv.scrollHeight;
  }

  function clearOutput() {
    if (!isEditorActive && cachedOutputDiv) {
      while (cachedOutputDiv.firstChild) {
        cachedOutputDiv.removeChild(cachedOutputDiv.firstChild);
      }
    }
  }

  function _consoleLogOverride(...args) {
    const { Config, Utils } = dependencies;
    if (
        cachedOutputDiv &&
        typeof Utils !== "undefined" &&
        typeof Utils.formatConsoleArgs === "function"
    )
      void appendToOutput(`LOG: ${Utils.formatConsoleArgs(args)}`, {
        typeClass: Config.CSS_CLASSES.CONSOLE_LOG_MSG,
      });
    originalConsoleLog.apply(console, args);
  }

  function _consoleWarnOverride(...args) {
    const { Config, Utils } = dependencies;
    if (
        cachedOutputDiv &&
        typeof Utils !== "undefined" &&
        typeof Utils.formatConsoleArgs === "function"
    )
      void appendToOutput(`WARN: ${Utils.formatConsoleArgs(args)}`, {
        typeClass: Config.CSS_CLASSES.WARNING_MSG,
      });
    originalConsoleWarn.apply(console, args);
  }

  function _consoleErrorOverride(...args) {
    const { Config, Utils } = dependencies;
    if (
        cachedOutputDiv &&
        typeof Utils !== "undefined" &&
        typeof Utils.formatConsoleArgs === "function"
    )
      void appendToOutput(`ERROR: ${Utils.formatConsoleArgs(args)}`, {
        typeClass: Config.CSS_CLASSES.ERROR_MSG,
      });
    originalConsoleError.apply(console, args);
  }

  function initializeConsoleOverrides() {
    if (
        typeof dependencies.Utils === "undefined" ||
        typeof dependencies.Utils.formatConsoleArgs !== "function"
    ) {
      originalConsoleError(
          "OutputManager: Cannot initialize console overrides, Utils or Utils.formatConsoleArgs is not defined."
      );
      return;
    }
    console.log = _consoleLogOverride;
    console.warn = _consoleWarnOverride;
    console.error = _consoleErrorOverride;
  }

  return {
    initialize,
    setDependencies, // Expose the new method
    setEditorActive,
    appendToOutput,
    clearOutput,
    initializeConsoleOverrides,
  };
})();