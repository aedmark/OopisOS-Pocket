window.EditorManager = class EditorManager extends App {
  constructor() {
    super();
    this.state = {};
    this.dependencies = {};
    this._debouncedPushUndo = null;
    this.callbacks = {};
    this.ui = null;
  }

  enter(appLayer, options = {}) {
    const { filePath, fileContent, onSaveCallback, dependencies } = options;
    this.dependencies = dependencies;
    this.callbacks = this._createCallbacks();

    this._debouncedPushUndo = this.dependencies.Utils.debounce((content) => {
      if (!this.isActive) return;
      this.state.undoStack.push(content);
      if (this.state.undoStack.length > 50) {
        this.state.undoStack.shift();
      }
      this.state.redoStack = [];
    }, 500);

    const normalizedContent = (fileContent || "").replace(/\r\n|\r/g, "\n");

    this.state = {
      currentFilePath: filePath,
      originalContent: normalizedContent,
      currentContent: normalizedContent,
      isDirty: false,
      fileMode: this._getFileMode(filePath),
      viewMode: "split",
      undoStack: [normalizedContent],
      redoStack: [],
      wordWrap: this.dependencies.StorageManager.loadItem(
          this.dependencies.Config.STORAGE_KEYS.EDITOR_WORD_WRAP_ENABLED,
          "Editor Word Wrap",
          false
      ),
      onSaveCallback: onSaveCallback || null,
    };

    this.isActive = true;

    this.ui = new EditorUI(this.state, this.callbacks, this.dependencies);
    this.container = this.ui.elements.container;

    appLayer.appendChild(this.container);
    this.container.focus();
  }

  async exit() {
    if (!this.isActive) return;

    if (this.state.isDirty) {
      await new Promise((resolve) => {
        this.dependencies.ModalManager.request({
          context: "graphical",
          type: "confirm",
          messageLines: [
            "You have unsaved changes that will be lost.",
            "Are you sure you want to exit?",
          ],
          confirmText: "Discard Changes",
          cancelText: "Cancel",
          onConfirm: () => {
            this._performExit();
            resolve();
          },
          onCancel: () => resolve(),
        });
      });
    } else {
      this._performExit();
    }
  }

  _performExit() {
    this.ui.hideAndReset();
    this.dependencies.AppLayerManager.hide(this);
    this.isActive = false;
    this.state = {};
  }

  async handleKeyDown(event) {
    if (!this.isActive) return;

    if (event.ctrlKey || event.metaKey) {
      let handled = true;
      switch (event.key.toLowerCase()) {
        case "s":
          await this.callbacks.onSaveRequest();
          break;
        case "o":
          this.exit();
          break;
        case "p":
          this.callbacks.onTogglePreview();
          break;
        case "z":
          event.shiftKey ? this.callbacks.onRedo() : this.callbacks.onUndo();
          break;
        case "y":
          this.callbacks.onRedo();
          break;
        default:
          handled = false;
          break;
      }
      if (handled) event.preventDefault();
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.exit();
    }
  }

  _getFileMode(filePath) {
    const { Utils } = this.dependencies;
    if (!filePath) return "text";
    const extension = Utils.getFileExtension(filePath);
    if (extension === "md") return "markdown";
    if (extension === "html") return "html";
    return "text";
  }

  _createCallbacks() {
    return {
      onContentChange: (newContent) => {
        this.state.currentContent = newContent;
        this.state.isDirty =
            this.state.currentContent !== this.state.originalContent;
        this.ui.updateDirtyStatus(this.state.isDirty);
        this._debouncedPushUndo(newContent);
        if (this.state.viewMode !== "edit") {
          this.ui.renderPreview(
              this.state.currentContent,
              this.state.fileMode
          );
        }
      },
      onSaveRequest: async () => {
        const { ModalManager, FileSystemManager, UserManager } = this.dependencies;
        let savePath = this.state.currentFilePath;
        if (!savePath) {
          savePath = await new Promise((resolve) => {
            ModalManager.request({
              context: "graphical",
              type: "input",
              messageLines: ["Save New File"],
              placeholder: "/home/Guest/untitled.txt",
              onConfirm: (value) => resolve(value),
              onCancel: () => resolve(null),
            });
          });
          if (!savePath) {
            this.ui.updateStatusMessage("Save cancelled.");
            return;
          }
          this.state.currentFilePath = savePath;
          this.state.fileMode = this._getFileMode(savePath);
          this.ui.updateWindowTitle(savePath);
        }
        const saveResult = await FileSystemManager.createOrUpdateFile(
            savePath,
            this.state.currentContent,
            {
              currentUser: UserManager.getCurrentUser().name,
              primaryGroup: UserManager.getPrimaryGroupForUser(
                  UserManager.getCurrentUser().name
              ),
            }
        );
        if (saveResult.success && (await FileSystemManager.save())) {
          this.state.originalContent = this.state.currentContent;
          this.state.isDirty = false;
          this.ui.updateDirtyStatus(false);
          this.ui.updateStatusMessage(`File saved to ${savePath}`);
          if (typeof this.state.onSaveCallback === "function") {
            await this.state.onSaveCallback(savePath);
          }
        } else {
          this.ui.updateStatusMessage(
              `Error: ${saveResult.error || "Failed to save file system."}`
          );
        }
      },
      onExitRequest: this.exit.bind(this),
      onTogglePreview: () => {
        const modes = ["split", "edit", "preview"];
        this.state.viewMode =
            this.state.fileMode === "text"
                ? "edit"
                : modes[(modes.indexOf(this.state.viewMode) + 1) % modes.length];
        this.ui.setViewMode(
            this.state.viewMode,
            this.state.fileMode,
            this.state.currentContent
        );
      },
      onUndo: () => {
        if (this.state.undoStack.length > 1) {
          this.state.redoStack.push(this.state.undoStack.pop());
          this.state.currentContent =
              this.state.undoStack[this.state.undoStack.length - 1];
          this.ui.setContent(this.state.currentContent);
        }
      },
      onRedo: () => {
        if (this.state.redoStack.length > 0) {
          const nextState = this.state.redoStack.pop();
          this.state.undoStack.push(nextState);
          this.state.currentContent = nextState;
          this.ui.setContent(this.state.currentContent);
        }
      },
      onWordWrapToggle: () => {
        const { StorageManager, Config } = this.dependencies;
        this.state.wordWrap = !this.state.wordWrap;
        StorageManager.saveItem(
            Config.STORAGE_KEYS.EDITOR_WORD_WRAP_ENABLED,
            this.state.wordWrap
        );
        this.ui.setWordWrap(this.state.wordWrap);
      },
    };
  }
}