// scripts/apps/gemini_chat/gemini_chat_manager.js
window.GeminiChatManager = class GeminiChatManager extends App {
  constructor() {
    super();
    this.state = {};
    this.dependencies = {}; // To be populated on enter
    this.callbacks = {};
  }

  async enter(appLayer, options = {}) {
    if (this.isActive) return;

    this.dependencies = options.dependencies; // Dependency injection
    this.callbacks = this._createCallbacks(); // Create callbacks now

    this.isActive = true;
    this.state = {
      isActive: true,
      conversationHistory: [],
      provider: options.provider || "gemini",
      model: options.model || null,
      options,
      terminalContext: "",
    };

    this.container = this.dependencies.GeminiChatUI.buildAndShow(this.callbacks);
    appLayer.appendChild(this.container);

    // Initial message
    this.dependencies.GeminiChatUI.appendMessage(
        "Greetings! What would you like to do?",
        "ai",
        true
    );

    this.container.focus();
  }

  exit() {
    if (!this.isActive) return;
    this.dependencies.GeminiChatUI.hideAndReset();
    this.dependencies.AppLayerManager.hide(this);
    this.isActive = false;
    this.state = {};
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      this.exit();
    }
  }

  _createCallbacks() {
    const self = this;
    return {
      onSendMessage: async (userInput) => {
        const { GeminiChatUI, AIManager } = self.dependencies;
        if (!userInput || userInput.trim() === "") return;

        GeminiChatUI.appendMessage(userInput, "user", false);
        self.state.conversationHistory.push({
          role: "user",
          parts: [{ text: userInput }],
        });

        GeminiChatUI.toggleLoader(true);

        const verboseCallback = (message, typeClass) => {
          GeminiChatUI.appendMessage(message, "system", false);
        };

        const agentResult = await AIManager.performAgenticSearch(
            userInput,
            self.state.conversationHistory,
            self.state.provider,
            self.state.model,
            { isInteractive: true, ...self.state.options, verboseCallback, dependencies: self.dependencies }
        );

        GeminiChatUI.toggleLoader(false);

        if (agentResult.success) {
          const finalAnswer = agentResult.data;
          self.state.conversationHistory.push({
            role: "model",
            parts: [{ text: finalAnswer }],
          });
          GeminiChatUI.appendMessage(finalAnswer, "ai", true);
        } else {
          GeminiChatUI.appendMessage(
              `An error occurred: ${agentResult.error}`,
              "ai",
              true
          );
          self.state.conversationHistory.pop();
        }
      },
      onExit: self.exit.bind(self),
      onRunCommand: async (commandText) => {
        const { CommandExecutor } = self.dependencies;
        self.exit();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await CommandExecutor.processSingleCommand(commandText, {
          isInteractive: true,
        });
      },
    };
  }
}