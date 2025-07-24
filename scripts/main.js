// scripts/main.js

let soundManager;

function initializeTerminalEventListeners(dependencies) {
  const {
    TerminalManager,
    OutputManager,
    Config,
    AppLayerManager,
    CommandManager,
  } = dependencies;
  const terminalInput = document.getElementById("terminal-input");
  const terminalContainer = document.querySelector(".terminal-container");

  terminalInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (soundManager && !soundManager.isInitialized) {
        await soundManager.initialize();
      }
      await CommandManager.executeCommand();
    } else if (e.key === "Tab") {
      e.preventDefault();
      CommandManager.handleTabCompletion();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      CommandManager.showPreviousCommand();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      CommandManager.showNextCommand();
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      TerminalManager.handleCtrlC();
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      CommandManager.executeCommand("clear");
    }
  });

  terminalContainer.addEventListener("click", (e) => {
    if (window.getSelection().toString() === "") {
      const terminalInput = document.getElementById("terminal-input");
      if (terminalInput) {
        terminalInput.focus();
      }
    }
  });
}

window.onload = async () => {
  const domElements = {
    terminalContainer: document.querySelector(".terminal-container"),
    terminalInput: document.getElementById("terminal-input"),
    terminalOutput: document.getElementById("terminal-output"),
    terminalPrompt: document.getElementById("terminal-prompt"),
    terminalInputContainer: document.getElementById("terminal-input-line"),
    appLayer: document.getElementById("app-layer"),
    modalLayer: document.getElementById("modal-layer"),
    modalContainer: document.getElementById("modal-container"),
    modalTitle: document.getElementById("modal-title"),
    modalContent: document.getElementById("modal-content"),
    modalCloseButton: document.getElementById("modal-close-button"),
  };

  soundManager = new SoundManager();
  const configManager = new ConfigManager();
  const storageManager = new StorageManager();
  const indexedDBManager = new IndexedDBManager();
  const storageHAL = new DefaultStorageHAL();
  const groupManager = new GroupManager();
  const fsManager = new FileSystemManager();
  const userManager = new UserManager();
  const errorHandler = new ErrorHandler();
  const outputManager = new OutputManager();
  const terminalManager = new TerminalManager();
  const aliasManager = new AliasManager();
  const commandManager = new CommandManager();
  const terminalUI = new TerminalUI();
  const modalManager = new ModalManager();
  const appLayerManager = new AppLayerManager();
  const utils = new Utils();

  const dependencies = {
    Config: configManager,
    StorageManager: storageManager,
    IndexedDBManager: indexedDBManager,
    StorageHAL: storageHAL,
    GroupManager: groupManager,
    FileSystemManager: fsManager,
    UserManager: userManager,
    ErrorHandler: errorHandler,
    OutputManager: outputManager,
    TerminalManager: terminalManager,
    AliasManager: aliasManager,
    CommandManager: commandManager,
    TerminalUI: terminalUI,
    ModalManager: modalManager,
    AppLayerManager: appLayerManager,
    SoundManager: soundManager,
    Utils: utils,
    COMMANDS_MANIFEST: window.COMMANDS_MANIFEST,
  };

  Object.values(dependencies).forEach((manager) => {
    if (manager && typeof manager.setDependencies === "function") {
      manager.setDependencies(dependencies);
    }
  });

  const appLayer = dependencies.AppLayerManager;
  appLayer.setDependencies(dependencies);

  try {
    outputManager.initialize(domElements);
    terminalUI.initialize(domElements);
    modalManager.initialize(domElements);
    appLayerManager.initialize(domElements);

    await storageHAL.init();
    aliasManager.initialize();
    outputManager.initializeConsoleOverrides();
    await fsManager.load();
    await userManager.initializeDefaultUsers();
    await groupManager.initializeDefaultGroups();

    await terminalManager.initialize();

    initializeTerminalEventListeners(dependencies);

    outputManager.write(configManager.MOTD);
    terminalManager.setPrompt();
  } catch (error) {
    errorHandler.handleError(error, "An error occurred during initialization.");
    outputManager.write(
        "System initialization failed. Please check the console for errors.",
        "error"
    );
  }
};