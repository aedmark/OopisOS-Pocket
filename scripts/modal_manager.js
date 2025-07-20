// scripts/modal_manager.js
var ModalManager = (() => {
  "use strict";
  let isAwaitingTerminalInput = false;
  let activeModalContext = null;
  let cachedTerminalBezel = null;

  // --- DEPENDENCIES TO BE INJECTED ---
  let dependencies = {}; // Switched to a single dependencies object

  function initialize(dom) {
    cachedTerminalBezel = dom.terminalBezel;
  }

  // --- THIS IS THE CORRECTED METHOD ---
  function setDependencies(injectedDependencies) {
    dependencies = injectedDependencies;
  }

  function _createModalDOM(options) {
    const {
      messageLines,
      onConfirm,
      onCancel,
      type,
      confirmText = "OK",
      cancelText = "Cancel",
      placeholder = "",
      obscured = false,
      data = {},
    } = options;
    const { Utils } = dependencies; // Destructure from the dependencies object

    if (!cachedTerminalBezel) {
      console.error(
          "ModalManager: Cannot find terminal-bezel to attach modal."
      );
      if (onCancel) onCancel(data);
      return;
    }

    const removeModal = () => {
      const modal = document.getElementById("dynamic-modal-dialog");
      if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    };

    const confirmButton = Utils.createElement("button", {
      className: "btn btn--confirm",
      textContent: confirmText,
    });

    const cancelButton = Utils.createElement("button", {
      className: "btn btn--cancel",
      textContent: cancelText,
    });

    let inputField = null;
    if (type === "input") {
      inputField = Utils.createElement("input", {
        type: obscured ? "password" : "text",
        placeholder: placeholder,
        className: "modal-dialog__input",
      });
    }

    const confirmHandler = () => {
      removeModal();
      if (onConfirm) {
        const value = inputField ? inputField.value : null;
        onConfirm(value, data);
      }
    };

    const cancelHandler = () => {
      removeModal();
      if (onCancel) onCancel(data);
    };

    confirmButton.addEventListener("click", confirmHandler);
    cancelButton.addEventListener("click", cancelHandler);

    if (inputField) {
      inputField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          confirmHandler();
        } else if (e.key === "Escape") {
          cancelHandler();
        }
      });
    }

    const buttonContainer = Utils.createElement(
        "div",
        { className: "modal-dialog__buttons" },
        [confirmButton, cancelButton]
    );
    const messageContainer = Utils.createElement("div");
    messageLines.forEach((line) => {
      messageContainer.appendChild(
          Utils.createElement("p", { textContent: line })
      );
    });

    const modalDialogContents = [messageContainer];
    if (inputField) {
      modalDialogContents.push(inputField);
    }
    modalDialogContents.push(buttonContainer);

    const modalDialog = Utils.createElement(
        "div",
        { className: "modal-dialog" },
        modalDialogContents
    );
    const modalOverlay = Utils.createElement(
        "div",
        { id: "dynamic-modal-dialog", className: "modal-overlay" },
        [modalDialog]
    );

    cachedTerminalBezel.appendChild(modalOverlay);

    if (inputField) {
      inputField.focus();
    }
  }

  function _renderTerminalPrompt(options) {
    const { messageLines, onConfirm, onCancel, type, obscured, data } = options;
    const { OutputManager, TerminalUI, Config } = dependencies; // Destructure from the dependencies object

    if (isAwaitingTerminalInput) {
      if (onCancel) onCancel(data);
      return;
    }
    isAwaitingTerminalInput = true;
    activeModalContext = { onConfirm, onCancel, data, type, obscured };
    messageLines.forEach(
        (line) =>
            void OutputManager.appendToOutput(line, { typeClass: "text-warning" })
    );

    if (type === "confirm") {
      void OutputManager.appendToOutput(Config.MESSAGES.CONFIRMATION_PROMPT, {
        typeClass: "text-subtle",
      });
    }

    TerminalUI.showInputLine();
    TerminalUI.setInputState(true, obscured);
    TerminalUI.focusInput();
    TerminalUI.clearInput();
    TerminalUI.scrollOutputToEnd();
  }

  function request(options) {
    const { OutputManager, TerminalUI, Config } = dependencies; // Destructure from the dependencies object
    const finalOptions = {
      type: "confirm",
      context: "terminal",
      ...options,
    };
    const { context, type } = finalOptions;

    // Scripting / Non-interactive handling
    if (
        finalOptions.options?.scriptingContext?.isScripting ||
        finalOptions.options?.stdinContent
    ) {
      const scriptContext = finalOptions.options.scriptingContext;
      let inputLine = null;

      if (finalOptions.options.stdinContent) {
        inputLine = finalOptions.options.stdinContent.trim().split("\\n")[0];
      } else if (scriptContext) {
        let nextLineIndex = scriptContext.currentLineIndex + 1;
        while (nextLineIndex < scriptContext.lines.length) {
          const line = scriptContext.lines[nextLineIndex].trim();
          if (line && !line.startsWith("#")) {
            inputLine = line;
            scriptContext.currentLineIndex = nextLineIndex;
            break;
          }
          nextLineIndex++;
        }
      }

      if (inputLine !== null) {
        finalOptions.messageLines.forEach(
            (line) =>
                void OutputManager.appendToOutput(line, {
                  typeClass: "text-warning",
                })
        );
        if (type === "confirm") {
          void OutputManager.appendToOutput(
              Config.MESSAGES.CONFIRMATION_PROMPT,
              { typeClass: "text-subtle" }
          );
        }
        const promptEcho = `${TerminalUI.getPromptText()}`;
        const echoInput = finalOptions.obscured
            ? "*".repeat(inputLine.length)
            : inputLine;
        void OutputManager.appendToOutput(`${promptEcho}${echoInput}`);

        if (type === "confirm") {
          if (inputLine.toUpperCase() === "YES") {
            if (finalOptions.onConfirm)
              finalOptions.onConfirm(finalOptions.data);
          } else {
            if (finalOptions.onCancel) finalOptions.onCancel(finalOptions.data);
          }
        } else {
          // type === 'input'
          if (finalOptions.onConfirm)
            finalOptions.onConfirm(inputLine, finalOptions.data);
        }
      } else {
        // No more lines in script
        if (finalOptions.onCancel) finalOptions.onCancel(finalOptions.data);
      }
      return;
    }

    if (context === "graphical") {
      _createModalDOM(finalOptions);
    } else {
      // context === 'terminal'
      _renderTerminalPrompt(finalOptions);
    }
  }

  async function handleTerminalInput(input) {
    if (!isAwaitingTerminalInput) return false;

    const { onConfirm, onCancel, data, type, obscured } = activeModalContext;
    const { OutputManager, TerminalUI, Config } = dependencies; // Destructure from the dependencies object

    const promptString = `${TerminalUI.getPromptText()}`;
    const echoInput = obscured ? "*".repeat(input.length) : input.trim();
    await OutputManager.appendToOutput(`${promptString}${echoInput}`);

    isAwaitingTerminalInput = false;
    activeModalContext = null;
    TerminalUI.setInputState(true, false); // Reset obscured mode
    TerminalUI.clearInput();

    if (type === "confirm") {
      if (input.trim().toUpperCase() === "YES") {
        if (onConfirm) await onConfirm(data);
      } else {
        if (onCancel) {
          await onCancel(data);
        } else {
          await OutputManager.appendToOutput(
              Config.MESSAGES.OPERATION_CANCELLED,
              { typeClass: "text-subtle" }
          );
        }
      }
    } else {
      // type === 'input'
      if (onConfirm) await onConfirm(input.trim(), data);
    }

    return true;
  }

  return {
    initialize,
    setDependencies, // <-- EXPOSE THE NEW METHOD
    request,
    handleTerminalInput,
    isAwaiting: () => isAwaitingTerminalInput,
  };
})();