window.ChidiUI = class ChidiUI {
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
    const { Utils } = this.dependencies;

    const header = Utils.createElement(
        "header",
        { className: "chidi-console-header" },
        Utils.createElement(
            "div",
            { id: "chidi-nav-controls", className: "chidi-control-group" },
            (this.elements.prevBtn = Utils.createElement("button", {
              id: "chidi-prevBtn",
              className: "chidi-btn",
              textContent: "< Prev",
            })),
            (this.elements.nextBtn = Utils.createElement("button", {
              id: "chidi-nextBtn",
              className: "chidi-btn",
              textContent: "Next >",
            }))
        ),
        (this.elements.mainTitle = Utils.createElement("h1", {
          id: "chidi-mainTitle",
          textContent: "chidi.md",
        })),
        Utils.createElement(
            "div",
            { className: "chidi-control-group" },
            (this.elements.summarizeBtn = Utils.createElement("button", {
              id: "chidi-summarizeBtn",
              className: "chidi-btn",
              textContent: "Summarize",
            })),
            (this.elements.studyBtn = Utils.createElement("button", {
              id: "chidi-suggestQuestionsBtn",
              className: "chidi-btn",
              textContent: "Study",
            })),
            (this.elements.askBtn = Utils.createElement("button", {
              id: "chidi-askAllFilesBtn",
              className: "chidi-btn",
              textContent: "Ask",
            }))
        )
    );

    this.elements.markdownDisplay = Utils.createElement("main", {
      id: "chidi-markdownDisplay",
      className: "chidi-markdown-content",
    });

    const footer = Utils.createElement(
        "footer",
        { className: "chidi-status-readout" },
        (this.elements.fileCountDisplay = Utils.createElement("div", {
          id: "chidi-fileCountDisplay",
          className: "chidi-status-item",
        })),
        (this.elements.messageBox = Utils.createElement("div", {
          id: "chidi-messageBox",
          className: "chidi-status-message",
        })),
        Utils.createElement(
            "div",
            { className: "chidi-control-group" },
            (this.elements.loader = Utils.createElement("div", {
              id: "chidi-loader",
              className: "chidi-loader chidi-hidden",
            })),
            (this.elements.saveSessionBtn = Utils.createElement("button", {
              id: "chidi-saveSessionBtn",
              className: "chidi-btn",
              textContent: "Save",
            })),
            (this.elements.exportBtn = Utils.createElement("button", {
              id: "chidi-exportBtn",
              className: "chidi-btn",
              textContent: "Export",
            })),
            (this.elements.closeBtn = Utils.createElement("button", {
              id: "chidi-closeBtn",
              className: "chidi-btn chidi-exit-btn",
              textContent: "Exit",
            }))
        )
    );

    this.elements.container = Utils.createElement(
        "div",
        { id: "chidi-console-panel" },
        header,
        this.elements.markdownDisplay,
        footer
    );

    this._setupEventListeners();
    this.update(initialState);
  }

  hideAndReset() {
    this.elements = {};
    this.callbacks = {};
    this.dependencies = {};
  }

  update(state) {
    if (!this.elements.container) return;
    const { Utils } = this.dependencies;

    const hasFiles = state.loadedFiles.length > 0;
    const currentFile = hasFiles ? state.loadedFiles[state.currentIndex] : null;

    this.elements.fileCountDisplay.textContent = `File ${state.currentIndex + 1} of ${state.loadedFiles.length}`;
    this.elements.prevBtn.disabled = !hasFiles || state.currentIndex === 0;
    this.elements.nextBtn.disabled =
        !hasFiles || state.currentIndex >= state.loadedFiles.length - 1;

    this.elements.exportBtn.disabled = !hasFiles;
    this.elements.saveSessionBtn.disabled = !hasFiles;
    this.elements.summarizeBtn.disabled = !hasFiles;
    this.elements.studyBtn.disabled = !hasFiles;
    this.elements.askBtn.disabled = !hasFiles;

    if (currentFile) {
      this.elements.mainTitle.textContent = currentFile.name.replace(
          /\.(md|txt|js|sh)$/i,
          ""
      );
      this.elements.markdownDisplay.className = "chidi-markdown-content";
      if (
          currentFile.isCode ||
          Utils.getFileExtension(currentFile.name) === "txt"
      ) {
        this.elements.markdownDisplay.innerHTML = `<pre>${currentFile.content || ""}</pre>`;
      } else {
        this.elements.markdownDisplay.innerHTML = DOMPurify.sanitize(
            marked.parse(currentFile.content)
        );
      }
    } else {
      this.elements.mainTitle.textContent = "chidi.md";
      this.elements.markdownDisplay.innerHTML = `<p>No files loaded.</p>`;
    }
  }

  _setupEventListeners() {
    this.elements.closeBtn.addEventListener("click", this.callbacks.onClose);
    this.elements.exportBtn.addEventListener("click", this.callbacks.onExport);
    this.elements.prevBtn.addEventListener("click", this.callbacks.onPrevFile);
    this.elements.nextBtn.addEventListener("click", this.callbacks.onNextFile);
    this.elements.askBtn.addEventListener("click", this.callbacks.onAsk);
    this.elements.summarizeBtn.addEventListener("click", this.callbacks.onSummarize);
    this.elements.studyBtn.addEventListener("click", this.callbacks.onStudy);
    this.elements.saveSessionBtn.addEventListener("click", this.callbacks.onSaveSession);

    document.addEventListener(
        "keydown",
        (e) => {
          if (!this.elements.container?.isConnected) return;
          if (e.key === "Escape") {
            this.callbacks.onClose();
          }
        },
        true
    );
  }

  showMessage(msg) {
    if (this.elements.messageBox) this.elements.messageBox.textContent = `֎ ${msg}`;
  }

  appendAiOutput(title, content) {
    const outputBlock = this.dependencies.Utils.createElement("div", {
      className: "chidi-ai-output",
    });
    outputBlock.innerHTML = DOMPurify.sanitize(
        marked.parse(`### ${title}\n\n${content}`)
    );
    this.elements.markdownDisplay.appendChild(outputBlock);
    outputBlock.scrollIntoView({ behavior: "smooth", block: "start" });
    this.showMessage(`AI Response received for "${title}".`);
  }

  toggleLoader(show) {
    if (this.elements.loader)
      this.elements.loader.classList.toggle("chidi-hidden", !show);
  }

  packageSessionAsHTML(state) {
    const { Utils } = this.dependencies;
    const currentFile = state.loadedFiles[state.currentIndex];
    const content = this.elements.markdownDisplay.innerHTML;
    const title = `Chidi Session: ${currentFile?.name || "Untitled"}`;
    const styles =
        "body{background-color:#0d0d0d;color:#e4e4e7;font-family:'VT323',monospace;line-height:1.6;padding:2rem}h1,h2,h3{border-bottom:1px solid #444;padding-bottom:.3rem;color:#60a5fa}a{color:#34d399}pre{white-space:pre-wrap;background-color:#000;padding:1rem;border-radius:4px}.chidi-ai-output{border-top:2px dashed #60a5fa;margin-top:2rem;padding-top:1rem}";
    return `<!DOCTYPE html><html lang="en"><head><title>${title}</title><style>${styles}</style></head><body><h1>${title}</h1>${content}</body></html>`;
  }
}