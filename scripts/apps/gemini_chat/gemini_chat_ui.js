// scripts/apps/gemini_chat/gemini_chat_ui.js
"use strict";

window.GeminiChatUI = {
  elements: {},
  managerCallbacks: {},
  dependencies: {},

  buildAndShow(callbacks, deps) {
    this.managerCallbacks = callbacks;
    this.dependencies = deps;
    const { Utils } = this.dependencies;

    // Create DOM elements
    this.elements.container = Utils.createElement("div", {
      id: "gemini-chat-container",
    });
    const title = Utils.createElement("h2", { textContent: "Gemini Chat" });
    const exitBtn = Utils.createElement("button", {
      className: "btn btn--cancel",
      textContent: "Exit",
    });
    const header = Utils.createElement(
        "header",
        { className: "gemini-chat-header" },
        [title, exitBtn]
    );
    this.elements.messageDisplay = Utils.createElement("div", {
      className: "gemini-chat-messages",
    });
    this.elements.loader = Utils.createElement(
        "div",
        { className: "gemini-chat-loader hidden" },
        [
          Utils.createElement("span"),
          Utils.createElement("span"),
          Utils.createElement("span"),
        ]
    );
    this.elements.input = Utils.createElement("input", {
      type: "text",
      placeholder: "Type your message...",
      className: "gemini-chat-input",
    });
    const sendBtn = Utils.createElement("button", {
      className: "btn btn--confirm",
      textContent: "Send",
    });
    const form = Utils.createElement(
        "form",
        { className: "gemini-chat-form" },
        [this.elements.input, sendBtn]
    );

    this.elements.container.append(
        header,
        this.elements.messageDisplay,
        this.elements.loader,
        form
    );

    // Add event listeners
    exitBtn.addEventListener("click", () => this.managerCallbacks.onExit());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.managerCallbacks.onSendMessage(this.elements.input.value);
      this.elements.input.value = "";
    });
    this.elements.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    this.elements.input.focus();
    return this.elements.container;
  },

  hideAndReset() {
    if (this.elements.container) {
      this.elements.container.remove();
    }
    this.elements = {};
    this.managerCallbacks = {};
  },

  appendMessage(message, sender, processMarkdown) {
    if (!this.elements.messageDisplay) return;
    const { Utils } = this.dependencies;

    const messageDiv = Utils.createElement("div", {
      className: `gemini-chat-message ${sender}`,
    });

    if (processMarkdown) {
      const sanitizedHtml = DOMPurify.sanitize(marked.parse(message));
      messageDiv.innerHTML = sanitizedHtml;

      const copyBtn = Utils.createElement("button", {
        class: "btn",
        style:
            "position: absolute; top: 5px; right: 5px; font-size: 0.75rem; padding: 2px 5px;",
        textContent: "Copy",
      });
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(message);
          copyBtn.textContent = "Copied!";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 2000);
        } catch (err) {
          console.error("Failed to copy text:", err);
          copyBtn.textContent = "Error!";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 2000);
        }
      });
      messageDiv.style.position = "relative";
      messageDiv.appendChild(copyBtn);

      messageDiv.querySelectorAll("pre > code").forEach((codeBlock) => {
        const commandText = codeBlock.textContent.trim();
        if (!commandText.includes("\n")) {
          const runButton = Utils.createElement("button", {
            class: "btn btn--confirm",
            textContent: `Run Command`,
            style: "display: block; margin-top: 10px;",
          });
          runButton.addEventListener("click", () =>
              this.managerCallbacks.onRunCommand(commandText)
          );
          codeBlock.parentElement.insertAdjacentElement("afterend", runButton);
        }
      });
    } else {
      messageDiv.textContent = message;
    }

    this.elements.messageDisplay.appendChild(messageDiv);
    this.elements.messageDisplay.scrollTop = this.elements.messageDisplay.scrollHeight;
  },

  toggleLoader(show) {
    if (this.elements.loader) {
      this.elements.loader.classList.toggle("hidden", !show);
    }
  },
};