window.EditorUI = class EditorUI {
  constructor(initialState, callbacks, deps) {
    this.elements = {};
    this.managerCallbacks = callbacks;
    this.dependencies = deps;
    this.buildAndShow(initialState);
  }

  buildAndShow(initialState) {
    const { Utils, UIComponents } = this.dependencies;

    this.elements.container = Utils.createElement("div", {
      id: "editor-container",
      className: "editor-container",
    });
    this.elements.titleInput = Utils.createElement("input", {
      id: "editor-title",
      className: "editor-title-input",
      type: "text",
      value: initialState.currentFilePath || "Untitled",
    });
    const header = Utils.createElement(
        "header",
        { className: "editor-header" },
        [this.elements.titleInput]
    );

    this.elements.saveBtn = UIComponents.createButton("💾 Save", {
      onClick: () => this.managerCallbacks.onSaveRequest(),
    });
    this.elements.exitBtn = UIComponents.createButton("Exit", {
      onClick: () => this.managerCallbacks.onExitRequest(),
    });
    this.elements.previewBtn = UIComponents.createButton("👁️ View", {
      onClick: () => this.managerCallbacks.onTogglePreview(),
    });
    this.elements.undoBtn = UIComponents.createButton("↩ Undo", {
      onClick: () => this.managerCallbacks.onUndo(),
    });
    this.elements.redoBtn = UIComponents.createButton("↪ Redo", {
      onClick: () => this.managerCallbacks.onRedo(),
    });
    this.elements.wordWrapBtn = UIComponents.createButton("Wrap", {
      onClick: () => this.managerCallbacks.onWordWrapToggle(),
    });

    const toolbarGroup = Utils.createElement(
        "div",
        { className: "editor-toolbar-group" },
        [
          this.elements.previewBtn,
          this.elements.wordWrapBtn,
          this.elements.undoBtn,
          this.elements.redoBtn,
          this.elements.saveBtn,
          this.elements.exitBtn,
        ]
    );
    const toolbar = Utils.createElement(
        "div",
        { className: "editor-toolbar" },
        [toolbarGroup]
    );

    this.elements.textarea = Utils.createElement("textarea", {
      id: "editor-textarea",
      className: "editor-textarea",
      textContent: initialState.currentContent,
    });
    this.elements.preview = Utils.createElement("div", {
      id: "editor-preview",
      className: "editor-preview",
    });
    this.elements.main = Utils.createElement("main", { className: "editor-main" }, [
      this.elements.textarea,
      this.elements.preview,
    ]);

    this.elements.dirtyStatus = Utils.createElement("span", {
      id: "editor-dirty-status",
    });
    this.elements.statusMessage = Utils.createElement("span", {
      id: "editor-status-message",
    });
    const footer = Utils.createElement(
        "footer",
        { className: "editor-footer" },
        [this.elements.dirtyStatus, this.elements.statusMessage]
    );

    this.elements.container.append(header, toolbar, this.elements.main, footer);

    this._addEventListeners();
    this.updateDirtyStatus(initialState.isDirty);
    this.updateWindowTitle(initialState.currentFilePath);
    this.setWordWrap(initialState.wordWrap);
    this.setViewMode(
        initialState.viewMode,
        initialState.fileMode,
        initialState.currentContent
    );

    this.elements.textarea.focus();
  }

  renderPreview(content, mode) {
    if (!this.elements.preview) return;

    if (mode === "markdown") {
      this.elements.preview.innerHTML = DOMPurify.sanitize(marked.parse(content));
    } else if (mode === "html") {
      let iframe = this.elements.preview.querySelector("iframe");
      if (!iframe) {
        iframe = this.dependencies.Utils.createElement("iframe", {
          style: "width: 100%; height: 100%; border: none;",
        });
        this.elements.preview.innerHTML = ""; // Clear any previous content
        this.elements.preview.appendChild(iframe);
      }

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(DOMPurify.sanitize(content));
      iframeDoc.close();
    }
  }

  setViewMode(viewMode, fileMode, content) {
    if (!this.elements.preview || !this.elements.textarea || !this.elements.main) return;

    this.elements.previewBtn.disabled = fileMode === "text";

    if (fileMode === "text") {
      viewMode = "edit"; // Force editor-only mode for plain text
    }

    this.elements.main.classList.remove("editor-main--split", "editor-main--full");
    this.elements.textarea.classList.remove("hidden");
    this.elements.preview.classList.remove("hidden");

    switch (viewMode) {
      case "edit":
        this.elements.main.classList.add("editor-main--full");
        this.elements.preview.classList.add("hidden");
        break;
      case "preview":
        this.elements.main.classList.add("editor-main--full");
        this.elements.textarea.classList.add("hidden");
        this.renderPreview(content, fileMode);
        break;
      case "split":
      default:
        this.elements.main.classList.add("editor-main--split");
        this.renderPreview(content, fileMode);
        break;
    }
  }

  hideAndReset() {
    this.elements = {};
    this.managerCallbacks = {};
  }

  updateDirtyStatus(isDirty) {
    if (this.elements.dirtyStatus) {
      this.elements.dirtyStatus.textContent = isDirty ? "UNSAVED" : "SAVED";
      this.elements.dirtyStatus.style.color = isDirty
          ? "var(--color-warning)"
          : "var(--color-success)";
    }
  }

  updateWindowTitle(filePath) {
    if (this.elements.titleInput) {
      this.elements.titleInput.value = filePath || "Untitled";
    }
  }

  updateStatusMessage(message) {
    if (this.elements.statusMessage) {
      this.elements.statusMessage.textContent = message;
      setTimeout(() => {
        if (this.elements.statusMessage) this.elements.statusMessage.textContent = "";
      }, 3000);
    }
  }

  setContent(content) {
    if (this.elements.textarea) {
      this.elements.textarea.value = content;
    }
  }

  setWordWrap(enabled) {
    if (this.elements.textarea) {
      this.elements.textarea.style.whiteSpace = enabled ? "pre-wrap" : "pre";
      this.elements.textarea.style.wordBreak = enabled ? "break-all" : "normal";
      if (this.elements.wordWrapBtn) {
        this.elements.wordWrapBtn.classList.toggle("active", enabled);
      }
    }
  }

  _addEventListeners() {
    this.elements.textarea.addEventListener("input", () => {
      this.managerCallbacks.onContentChange(this.elements.textarea.value);
    });

    this.elements.saveBtn.addEventListener("click", () =>
        this.managerCallbacks.onSaveRequest()
    );
    this.elements.exitBtn.addEventListener("click", () =>
        this.managerCallbacks.onExitRequest()
    );
    this.elements.previewBtn.addEventListener("click", () =>
        this.managerCallbacks.onTogglePreview()
    );
    this.elements.undoBtn.addEventListener("click", () => this.managerCallbacks.onUndo());
    this.elements.redoBtn.addEventListener("click", () => this.managerCallbacks.onRedo());
    this.elements.wordWrapBtn.addEventListener("click", () =>
        this.managerCallbacks.onWordWrapToggle()
    );
  }
}