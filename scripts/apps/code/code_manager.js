window.CodeManager = class CodeManager extends App {
  constructor() {
    super();
    this.state = {};
    this.dependencies = {};
    this.debouncedHighlight = null;
    this.callbacks = {};
    this.ui = null;
  }

  _jsHighlighter(text) {
    const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    return escapedText
        .replace(/(\/\*[\s\S]*?\*\/|\/\/.+)/g, "<em>$1</em>") // Comments
        .replace(
            /\b(new|if|else|do|while|switch|for|in|of|continue|break|return|typeof|function|var|const|let|async|await|class|extends|true|false|null)(?=[^\w])/g,
            "<strong>$1</strong>"
        ) // Keywords
        .replace(/(".*?"|'.*?'|`.*?`)/g, "<strong><em>$1</em></strong>") // Strings
        .replace(/\b(\d+)/g, "<em><strong>$1</strong></em>"); // Numbers
  }

  _highlight(content) {
    if (this.ui) {
      const highlighted = this._jsHighlighter(content);
      this.ui.highlight(highlighted);
    }
  }

  enter(appLayer, options = {}) {
    if (this.isActive) return;

    this.dependencies = options.dependencies;
    this.callbacks = this._createCallbacks();
    this.debouncedHighlight = this.dependencies.Utils.debounce(this._highlight.bind(this), 100);

    this.state = {
      isActive: true,
      filePath: options.filePath,
      originalContent: options.fileContent || "",
    };

    const initialStateForUI = {
      filePath: options.filePath,
      fileContent: options.fileContent || "",
    };

    this.ui = new this.dependencies.CodeUI(initialStateForUI, this.callbacks, this.dependencies);
    this.container = this.ui.getContainer();

    this.callbacks.onInput(options.fileContent || "");

    appLayer.appendChild(this.container);
    this.isActive = true;
  }

  exit() {
    if (!this.isActive) return;
    this._performExit();
  }

  _performExit() {
    const { AppLayerManager } = this.dependencies;
    if (this.ui) {
      this.ui.hideAndReset();
    }
    AppLayerManager.hide(this);
    this.isActive = false;
    this.state = {};
    this.ui = null;
  }

  _createCallbacks() {
    return {
      onSave: async (filePath, content) => {
        const { OutputManager, UserManager, FileSystemManager } = this.dependencies;
        if (!filePath || !filePath.trim()) {
          // This case should be handled by the UI, but as a fallback:
          alert("Error: Filename cannot be empty.");
          return;
        }

        const absPath = FileSystemManager.getAbsolutePath(filePath);
        const currentUser = UserManager.getCurrentUser().name;
        const primaryGroup = UserManager.getPrimaryGroupForUser(currentUser);

        const saveResult = await FileSystemManager.createOrUpdateFile(
            absPath,
            content,
            {
              currentUser,
              primaryGroup,
            }
        );

        if (saveResult.success && (await FileSystemManager.save())) {
          this._performExit();
          await OutputManager.appendToOutput(
              `File saved to '${absPath}'.`,
              { typeClass: "text-success" }
          );
        } else {
          // Use a graphical alert for errors within a graphical app
          alert(`Error saving file: ${saveResult.error || "Filesystem error"}`);
        }
      },
      onExit: this.exit.bind(this),
      onTab: (textarea) => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        textarea.value =
            value.substring(0, start) + "  " + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        this.callbacks.onInput(textarea.value);
      },
      onInput: (content) => {
        this.debouncedHighlight(content);
      },
      onPaste: (textarea, pastedText) => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        textarea.value =
            value.substring(0, start) + pastedText + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd =
            start + pastedText.length;
        this.callbacks.onInput(textarea.value);
      },
    };
  }
}