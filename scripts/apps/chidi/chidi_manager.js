// scripts/apps/chidi/chidi_manager.js

window.ChidiManager = class ChidiManager extends App {
  constructor() {
    super();
    this.state = {};
    this.dependencies = {}; // To be populated on enter
    this.callbacks = {}; // FIX: Initialize as empty
  }

  enter(appLayer, options = {}) {
    if (this.isActive) return;

    this.dependencies = options.dependencies; // Dependency injection
    this.callbacks = this._createCallbacks(); // FIX: Create callbacks now

    this._initializeState(options.initialFiles, options.launchOptions);
    this.isActive = true;

    this.container = this.dependencies.ChidiUI.buildAndShow(this.state, this.callbacks);
    appLayer.appendChild(this.container);

    const initialMessage = this.state.isNewSession
        ? `New session started. Analyzing ${this.state.loadedFiles.length} files.`
        : `Chidi.md initialized. Analyzing ${this.state.loadedFiles.length} files.`;
    this.dependencies.ChidiUI.showMessage(initialMessage, true);
  }

  exit() {
    if (!this.isActive) return;
    this.dependencies.ChidiUI.hideAndReset();
    this.dependencies.AppLayerManager.hide(this);
    this.isActive = false;
    this.state = {};
  }

  _initializeState(initialFiles, launchOptions) {
    const { Utils } = this.dependencies;
    this.state = {
      isActive: true,
      loadedFiles: initialFiles.map((file) => ({
        ...file,
        isCode: ["js", "sh"].includes(Utils.getFileExtension(file.name)),
      })),
      currentIndex: initialFiles.length > 0 ? 0 : -1,
      isNewSession: launchOptions.isNewSession,
      provider: launchOptions.provider || "gemini",
      model: launchOptions.model || null,
      conversationHistory: [],
      sessionContext: initialFiles
          .map(
              (file) =>
                  `--- START OF DOCUMENT: ${file.name} ---\n\n${file.content}\n\n--- END OF DOCUMENT ---`
          )
          .join("\n\n"),
      CHIDI_SYSTEM_PROMPT: `You are Chidi, an AI-powered document analyst.

**Rules:**
- Your answers MUST be based *only* on the provided document context and the ongoing conversation history.
- If the answer is not in the documents, state that clearly. Do not use outside knowledge.
- Be concise, helpful, and directly answer the user's question.

--- PROVIDED DOCUMENT CONTEXT ---
{{documentContext}}
--- END DOCUMENT CONTEXT ---`,
    };

    if (launchOptions.isNewSession) {
      this.state.conversationHistory = [];
    }
  }

  async _callLlmApi(chatHistory, systemPrompt) {
    const { AIManager } = this.dependencies;
    const apiKeyResult = await AIManager.getApiKey(this.state.provider, {
      isInteractive: true,
      dependencies: this.dependencies,
    });
    if (!apiKeyResult.success) {
      return apiKeyResult;
    }
    const apiKey = apiKeyResult.data.key;

    const result = await AIManager.callLlmApi(
        this.state.provider,
        this.state.model,
        chatHistory,
        apiKey,
        this.dependencies,
        systemPrompt
    );
    return result;
  }

  _createCallbacks() {
    const self = this; // Capture 'this' context
    return {
      onPrevFile: () => {
        if (self.state.currentIndex > 0) {
          self.state.currentIndex--;
          self.dependencies.ChidiUI.update(self.state);
        }
      },
      onNextFile: () => {
        if (self.state.currentIndex < self.state.loadedFiles.length - 1) {
          self.state.currentIndex++;
          self.dependencies.ChidiUI.update(self.state);
        }
      },
      onAsk: async () => {
        const { ModalManager, ChidiUI } = self.dependencies;
        const userQuestion = await new Promise((resolve) => {
          ModalManager.request({
            context: "graphical",
            type: "input",
            messageLines: ["Ask a question about all loaded documents:"],
            onConfirm: (value) => resolve(value),
            onCancel: () => resolve(null),
          });
        });

        if (!userQuestion || !userQuestion.trim()) return;

        ChidiUI.toggleLoader(true);
        ChidiUI.showMessage("Analyzing...");

        self.state.conversationHistory.push({
          role: "user",
          parts: [{ text: userQuestion }],
        });

        const systemPromptWithContext = self.state.CHIDI_SYSTEM_PROMPT.replace(
            "{{documentContext}}",
            self.state.sessionContext
        );
        const result = await self._callLlmApi(
            self.state.conversationHistory,
            systemPromptWithContext
        );

        ChidiUI.toggleLoader(false);
        if (result.success) {
          self.state.conversationHistory.push({
            role: "model",
            parts: [{ text: result.answer }],
          });
          ChidiUI.appendAiOutput(`Answer for "${userQuestion}"`, result.answer);
          ChidiUI.showMessage("Response received.", true);
        } else {
          self.state.conversationHistory.pop(); // Remove the user question if the API call failed
          ChidiUI.appendAiOutput(
              "API Error",
              `Failed to get a response. Details: ${result.error}`
          );
          ChidiUI.showMessage(`Error: ${result.error}`, true);
        }
      },
      onSummarize: async () => {
        const { ChidiUI, Utils } = self.dependencies;
        const currentFile = self.state.loadedFiles[self.state.currentIndex];
        if (!currentFile) return;
        ChidiUI.toggleLoader(true);
        ChidiUI.showMessage(`Contacting ${self.state.provider} API...`);
        let contentToSummarize = currentFile.content; // Default to full content
        if (currentFile.isCode) {
          const comments = Utils.extractComments(
              currentFile.content,
              Utils.getFileExtension(currentFile.name)
          );
          if (comments && comments.trim() !== "") {
            contentToSummarize = comments;
          }
        }
        const prompt = `Please provide a concise summary of the following document:\n\n---\n\n${contentToSummarize}`;

        const result = await self._callLlmApi([
          { role: "user", parts: [{ text: prompt }] },
        ]);

        ChidiUI.toggleLoader(false);
        if (result.success) {
          ChidiUI.appendAiOutput("Summary", result.answer);
          ChidiUI.showMessage("Summary received.", true);
        } else {
          ChidiUI.appendAiOutput(
              "API Error",
              `Failed to get a summary. Details: ${result.error}`
          );
          ChidiUI.showMessage(`Error: ${result.error}`, true);
        }
      },
      onStudy: async () => {
        const { ChidiUI, Utils } = self.dependencies;
        const currentFile = self.state.loadedFiles[self.state.currentIndex];
        if (!currentFile) return;
        ChidiUI.toggleLoader(true);
        ChidiUI.showMessage(`Contacting ${self.state.provider} API...`);
        let contentForQuestions = currentFile.content;
        if (currentFile.isCode) {
          const comments = Utils.extractComments(
              currentFile.content,
              Utils.getFileExtension(currentFile.name)
          );
          if (comments && comments.trim() !== "") {
            contentForQuestions = comments;
          }
        }
        const prompt = `Based on the following document, what are some insightful questions a user might ask?\n\n---\n\n${contentForQuestions}`;

        const result = await self._callLlmApi([
          { role: "user", parts: [{ text: prompt }] },
        ]);

        ChidiUI.toggleLoader(false);
        if (result.success) {
          ChidiUI.appendAiOutput("Suggested Questions", result.answer);
          ChidiUI.showMessage("Suggestions received.", true);
        } else {
          ChidiUI.appendAiOutput(
              "API Error",
              `Failed to get suggestions. Details: ${result.error}`
          );
          ChidiUI.showMessage(`Error: ${result.error}`, true);
        }
      },
      onSaveSession: async () => {
        const { ModalManager, ChidiUI, FileSystemManager, UserManager } = self.dependencies;
        const filename = await new Promise((resolve) => {
          ModalManager.request({
            context: "graphical",
            type: "input",
            messageLines: ["Save Chidi Session As:"],
            placeholder: `chidi_session_${new Date().toISOString().split("T")[0]}.html`,
            onConfirm: (value) => resolve(value.trim()),
            onCancel: () => resolve(null),
          });
        });
        if (!filename) return;

        const htmlContent = ChidiUI.packageSessionAsHTML(self.state);
        const absPath = FileSystemManager.getAbsolutePath(filename);
        const saveResult = await FileSystemManager.createOrUpdateFile(
            absPath,
            htmlContent,
            {
              currentUser: UserManager.getCurrentUser().name,
              primaryGroup: UserManager.getPrimaryGroupForUser(
                  UserManager.getCurrentUser().name
              ),
            }
        );
        if (saveResult.success && (await FileSystemManager.save())) {
          ChidiUI.showMessage(`Session saved to '${filename}'.`, true);
        } else {
          ChidiUI.showMessage(
              `Error: ${saveResult.error || "Failed to save file system."}`,
              true
          );
        }
      },
      onExport: () => {
        const { ChidiUI, Utils } = self.dependencies;
        const htmlContent = ChidiUI.packageSessionAsHTML(self.state);
        const currentFile = self.state.loadedFiles[self.state.currentIndex];
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = Utils.createElement("a", {
          href: url,
          download: `${currentFile.name.replace(/\.(md|txt|js|sh)$/, "")}_session.html`,
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        ChidiUI.showMessage(`Exported session for ${currentFile.name}.`, true);
      },
      onClose: self.exit.bind(self),
    };
  }
}