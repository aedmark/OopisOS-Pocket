// scripts/main.js
function initializeTerminalEventListeners(domElements, commandExecutor) {
  if (!domElements.terminalDiv || !domElements.editableInputDiv) {
    console.error(
        "Terminal event listeners cannot be initialized: Core DOM elements not found."
    );
    return;
  }

  domElements.terminalDiv.addEventListener("click", (e) => {
    if (AppLayerManager.isActive()) return;

    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    if (
        !e.target.closest("button, a") &&
        (!domElements.editableInputDiv ||
            !domElements.editableInputDiv.contains(e.target))
    ) {
      if (domElements.editableInputDiv.contentEditable === "true")
        TerminalUI.focusInput();
    }
  });

  document.addEventListener("keydown", async (e) => {
    if (ModalManager.isAwaiting()) {
      if (e.key === "Enter") {
        e.preventDefault();
        await ModalManager.handleTerminalInput(
            TerminalUI.getCurrentInputValue()
        );
      }
      return;
    }

    if (AppLayerManager.isActive()) {
      return;
    }

    if (e.target !== domElements.editableInputDiv) {
      return;
    }

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        TabCompletionManager.resetCycle();
        await commandExecutor.processSingleCommand(
            TerminalUI.getCurrentInputValue(),
            { isInteractive: true }
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        const prevCmd = HistoryManager.getPrevious();
        if (prevCmd !== null) {
          TerminalUI.setIsNavigatingHistory(true);
          TerminalUI.setCurrentInputValue(prevCmd, true);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        const nextCmd = HistoryManager.getNext();
        if (nextCmd !== null) {
          TerminalUI.setIsNavigatingHistory(true);
          TerminalUI.setCurrentInputValue(nextCmd, true);
        }
        break;
      case "Tab":
        e.preventDefault();
        const currentInput = TerminalUI.getCurrentInputValue();
        const sel = window.getSelection();
        let cursorPos = 0;
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (
              domElements.editableInputDiv &&
              domElements.editableInputDiv.contains(range.commonAncestorContainer)
          ) {
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(domElements.editableInputDiv);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            cursorPos = preCaretRange.toString().length;
          } else {
            cursorPos = currentInput.length;
          }
        } else {
          cursorPos = currentInput.length;
        }
        const result = await TabCompletionManager.handleTab(
            currentInput,
            cursorPos
        );
        if (
            result?.textToInsert !== null &&
            result.textToInsert !== undefined
        ) {
          TerminalUI.setCurrentInputValue(result.textToInsert, false);
          TerminalUI.setCaretPosition(
              domElements.editableInputDiv,
              result.newCursorPos
          );
        }
        break;
    }
  });

  if (domElements.editableInputDiv) {
    domElements.editableInputDiv.addEventListener("paste", (e) => {
      e.preventDefault();
      if (domElements.editableInputDiv.contentEditable !== "true") return;
      const text = (e.clipboardData || window.clipboardData).getData(
          "text/plain"
      );
      const processedText = text.replace(/\r?\n|\r/g, " ");

      if (ModalManager.isAwaiting() && TerminalUI.isObscured()) {
        TerminalUI.handlePaste(processedText);
      } else {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (
            !domElements.editableInputDiv.contains(range.commonAncestorContainer)
        )
          return;
        range.deleteContents();
        const textNode = document.createTextNode(processedText);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  }
}

// Global scope for manager instances will now be implicitly created
// by the assignments in window.onload

window.onload = async () => {
  const domElements = {
    terminalBezel: document.getElementById("terminal-bezel"),
    terminalDiv: document.getElementById("terminal"),
    outputDiv: document.getElementById("output"),
    inputLineContainerDiv: document.querySelector(".terminal__input-line"),
    promptContainer: document.getElementById("prompt-container"),
    editableInputContainer: document.getElementById("editable-input-container"),
    editableInputDiv: document.getElementById("editable-input"),
    appLayer: document.getElementById("app-layer"),
  };

  // --- Phase 1: Instantiate All Managers ---
  const configManager = new ConfigManager();
  const storageManager = new StorageManager();
  const indexedDBManager = new IndexedDBManager();
  const groupManager = new GroupManager();
  const fsManager = new FileSystemManager(configManager);
  const userManager = new UserManager(configManager, fsManager, groupManager);
  const sessionManager = new SessionManager();
  const sudoManager = new SudoManager();
  const environmentManager = new EnvironmentManager();
  const commandExecutor = new CommandExecutor();
  // CORRECTED: Instantiate the MessageBusManager
  const messageBusManager = MessageBusManager;

  // --- Phase 2: Create a Centralized Dependencies Object ---
  const dependencies = {
    Config: configManager,
    StorageManager: storageManager,
    IndexedDBManager: indexedDBManager,
    FileSystemManager: fsManager,
    UserManager: userManager,
    SessionManager: sessionManager,
    CommandExecutor: commandExecutor,
    SudoManager: sudoManager,
    GroupManager: groupManager,
    EnvironmentManager: environmentManager,
    OutputManager: OutputManager,
    TerminalUI: TerminalUI,
    ModalManager: ModalManager,
    AppLayerManager: AppLayerManager,
    AliasManager: AliasManager,
    HistoryManager: HistoryManager,
    TabCompletionManager: TabCompletionManager,
    Utils: Utils,
    ErrorHandler: ErrorHandler,
    Lexer: Lexer,
    Parser: Parser,
    CommandRegistry: CommandRegistry,
    TimestampParser: TimestampParser,
    DiffUtils: DiffUtils,
    PatchUtils: PatchUtils,
    AIManager: AIManager,
    // CORRECTED: Add the MessageBusManager to the dependencies object
    MessageBusManager: messageBusManager,
  };

  // --- Phase 3: Inject Dependencies into All Managers ---
  configManager.setDependencies(dependencies);
  storageManager.setDependencies(dependencies);
  indexedDBManager.setDependencies(dependencies);
  fsManager.setDependencies(dependencies);
  userManager.setDependencies(sessionManager, sudoManager, commandExecutor, ModalManager, storageManager);
  sessionManager.setDependencies(configManager, fsManager, userManager, environmentManager, domElements, OutputManager, TerminalUI, storageManager);
  sudoManager.setDependencies(fsManager, groupManager, configManager);
  environmentManager.setDependencies(userManager, fsManager, configManager);
  commandExecutor.setDependencies(dependencies);
  groupManager.setDependencies(dependencies);

  // Inject dependencies into UI singletons
  OutputManager.initialize(domElements);
  OutputManager.setDependencies(dependencies);
  TerminalUI.initialize(domElements);
  TerminalUI.setDependencies(dependencies);
  ModalManager.initialize(domElements);
  ModalManager.setDependencies(dependencies);
  AppLayerManager.initialize(domElements);
  AppLayerManager.setDependencies(dependencies);
  AliasManager.setDependencies(dependencies);
  HistoryManager.setDependencies(dependencies);
  TabCompletionManager.setDependencies(dependencies);


  // --- Phase 4: Execute Initialization Logic ---
  try {
    await indexedDBManager.init();
    AliasManager.initialize();
    OutputManager.initializeConsoleOverrides();
    await fsManager.load();
    await userManager.initializeDefaultUsers();
    await configManager.loadFromFile();
    groupManager.initialize();
    environmentManager.initialize();
    sessionManager.initializeStack();
    sessionManager.loadAutomaticState(configManager.USER.DEFAULT_NAME);

    const guestHome = `/home/${configManager.USER.DEFAULT_NAME}`;
    if (!fsManager.getNodeByPath(fsManager.getCurrentPath())) {
      fsManager.setCurrentPath(
          fsManager.getNodeByPath(guestHome)
              ? guestHome
              : configManager.FILESYSTEM.ROOT_PATH
      );
    }

    // Phase 5: Initialize Event Listeners
    initializeTerminalEventListeners(domElements, commandExecutor);

    TerminalUI.updatePrompt();
    TerminalUI.focusInput();
    console.log(
        `${configManager.OS.NAME} v.${configManager.OS.VERSION} loaded successfully!`
    );

  } catch (error) {
    console.error(
        "Failed to initialize OopisOs on window.onload:",
        error,
        error.stack
    );
    if (domElements.outputDiv) {
      domElements.outputDiv.innerHTML += `<div class="text-error">FATAL ERROR: ${error.message}. Check console for details.</div>`;
    }
  }
};