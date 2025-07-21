window.BasicUI = class BasicUI {
  constructor(callbacks, dependencies) {
    this.elements = {};
    this.callbacks = callbacks;
    this.dependencies = dependencies;
    this._buildLayout();
  }

  getContainer() {
    return this.elements.container;
  }

  _buildLayout() {
    const { Utils } = this.dependencies;
    this.elements.output = Utils.createElement("div", {
      id: "basic-app-output",
      className: "basic-app__output",
    });
    this.elements.input = Utils.createElement("input", {
      id: "basic-app-input",
      className: "basic-app__input",
      type: "text",
      spellcheck: "false",
      autocapitalize: "none",
    });
    const inputContainer = Utils.createElement(
        "div",
        { className: "basic-app__input-line" },
        Utils.createElement("span", { textContent: ">" }),
        this.elements.input
    );
    this.elements.exitBtn = Utils.createElement("button", {
      className: "basic-app__exit-btn",
      textContent: "×",
      title: "Exit BASIC (EXIT)",
    });
    const header = Utils.createElement(
        "header",
        { className: "basic-app__header" },
        Utils.createElement("h2", {
          className: "basic-app__title",
          textContent: "Oopis BASIC v1.0",
        }),
        this.elements.exitBtn
    );
    this.elements.container = Utils.createElement(
        "div",
        { id: "basic-app-container", className: "basic-app__container" },
        header,
        this.elements.output,
        inputContainer
    );

    this.elements.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const command = this.elements.input.value;
        this.elements.input.value = "";
        this.callbacks.onInput(command);
      }
    });
    this.elements.exitBtn.addEventListener("click", () => this.callbacks.onExit());
  }

  write(text) {
    if (this.elements.output) {
      this.elements.output.textContent += text;
      this.elements.output.scrollTop = this.elements.output.scrollHeight;
    }
  }

  writeln(text) {
    if (this.elements.output) {
      this.elements.output.textContent += text + "\n";
      this.elements.output.scrollTop = this.elements.output.scrollHeight;
    }
  }

  focusInput() {
    if (this.elements.input) {
      this.elements.input.focus();
    }
  }

  reset() {
    this.elements = {};
    this.callbacks = {};
    this.dependencies = {};
  }
}