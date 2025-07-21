// scripts/session_manager.js
class EnvironmentManager {
  constructor() {
    this.envStack = [{}];
    this.userManager = null;
    this.fsManager = null;
    this.config = null; // Add config dependency
  }

  setDependencies(userManager, fsManager, config) {
    this.userManager = userManager;
    this.fsManager = fsManager;
    this.config = config;
  }

  _getActiveEnv() {
    return this.envStack[this.envStack.length - 1];
  }

  push() {
    this.envStack.push(JSON.parse(JSON.stringify(this._getActiveEnv())));
  }

  pop() {
    if (this.envStack.length > 1) {
      this.envStack.pop();
    } else {
      console.error(
          "EnvironmentManager: Attempted to pop the base environment stack."
      );
    }
  }

  initialize() {
    const baseEnv = {};
    const currentUser = this.userManager.getCurrentUser().name;
    baseEnv["USER"] = currentUser;
    baseEnv["HOME"] = `/home/${currentUser}`;
    baseEnv["HOST"] = this.config.OS.DEFAULT_HOST_NAME;
    baseEnv["PATH"] = "/bin:/usr/bin";
    // Reset the stack with the new base environment
    this.envStack = [baseEnv];
  }

  get(varName) {
    return this._getActiveEnv()[varName] || "";
  }

  set(varName, value) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
      return {
        success: false,
        error: `Invalid variable name: '${varName}'. Must start with a letter or underscore, followed by letters, numbers, or underscores.`,
      };
    }
    this._getActiveEnv()[varName] = value;
    return { success: true };
  }

  unset(varName) {
    delete this._getActiveEnv()[varName];
  }

  getAll() {
    return { ...this._getActiveEnv() };
  }

  load(vars) {
    this.envStack[this.envStack.length - 1] = { ...(vars || {}) };
  }

  clear() {
    this.envStack[this.envStack.length - 1] = {};
  }
}

const HistoryManager = (() => {
  "use strict";
  let commandHistory = [];
  let historyIndex = 0;
  let dependencies = {};
  let config = null;

  return {
    setDependencies: (injectedDependencies) => {
      dependencies = injectedDependencies;
      config = injectedDependencies.Config;
    },
    add: (command) => {
      const trimmedCommand = command.trim();
      if (
          trimmedCommand &&
          (commandHistory.length === 0 ||
              commandHistory[commandHistory.length - 1] !== trimmedCommand)
      ) {
        commandHistory.push(trimmedCommand);
        if (commandHistory.length > config.TERMINAL.MAX_HISTORY_SIZE)
          commandHistory.shift();
      }
      historyIndex = commandHistory.length;
    },
    getPrevious: () => {
      if (commandHistory.length > 0 && historyIndex > 0) {
        historyIndex--;
        return commandHistory[historyIndex];
      }
      return null;
    },
    getNext: () => {
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        return commandHistory[historyIndex];
      } else if (historyIndex >= commandHistory.length - 1) {
        historyIndex = commandHistory.length;
        return "";
      }
      return null;
    },
    resetIndex: () => {
      historyIndex = commandHistory.length;
    },
    getFullHistory: () => {
      return [...commandHistory];
    },
    clearHistory: () => {
      commandHistory = [];
      historyIndex = 0;
    },
    setHistory: (newHistory) => {
      commandHistory = Array.isArray(newHistory) ? [...newHistory] : [];
      if (commandHistory.length > config.TERMINAL.MAX_HISTORY_SIZE)
        commandHistory = commandHistory.slice(
            commandHistory.length - config.TERMINAL.MAX_HISTORY_SIZE
        );
      historyIndex = commandHistory.length;
    },
  };
})();


const AliasManager = (() => {
  "use strict";
  let aliases = {};
  let dependencies = {};
  let config = null;

  function _save() {
    const { StorageManager } = dependencies;
    StorageManager.saveItem(
        config.STORAGE_KEYS.ALIAS_DEFINITIONS,
        aliases,
        "Aliases"
    );
  }

  return {
    setDependencies: (injectedDependencies) => {
      dependencies = injectedDependencies;
      config = injectedDependencies.Config;
    },
    initialize: () => {
      const { StorageManager } = dependencies;
      aliases = StorageManager.loadItem(
          config.STORAGE_KEYS.ALIAS_DEFINITIONS,
          "Aliases",
          {}
      );
    },
    setAlias: (name, value) => {
      if (!name || typeof value !== "string") return false;
      aliases[name] = value;
      _save();
      return true;
    },
    removeAlias: (name) => {
      if (!aliases[name]) return false;
      delete aliases[name];
      _save();
      return true;
    },
    getAlias: (name) => {
      return aliases[name] || null;
    },
    getAllAliases: () => {
      return { ...aliases };
    },
    resolveAlias: (commandString) => {
      const parts = commandString.split(/\s+/);
      let commandName = parts[0];
      const remainingArgs = parts.slice(1).join(" ");
      const MAX_RECURSION = 10;
      let count = 0;
      while (aliases[commandName] && count < MAX_RECURSION) {
        const aliasValue = aliases[commandName];
        const aliasParts = aliasValue.split(/\s+/);
        commandName = aliasParts[0];
        const aliasArgs = aliasParts.slice(1).join(" ");
        commandString = `${commandName} ${aliasArgs} ${remainingArgs}`.trim();
        count++;
      }
      if (count === MAX_RECURSION) {
        return {
          error: `Alias loop detected for '${parts[0]}'`,
        };
      }
      return {
        newCommand: commandString,
      };
    },
  };
})();

class SessionManager {
  constructor() {
    this.userSessionStack = [];
    this.elements = {};
    this.config = null;
    this.fsManager = null;
    this.userManager = null;
    this.environmentManager = null;
    this.outputManager = null;
    this.terminalUI = null;
    this.storageManager = null;
  }

  setDependencies(
      config,
      fsManager,
      userManager,
      environmentManager,
      domElements,
      outputManager,
      terminalUI,
      storageManager
  ) {
    this.config = config;
    this.fsManager = fsManager;
    this.userManager = userManager;
    this.environmentManager = environmentManager;
    this.elements = domElements;
    this.outputManager = outputManager;
    this.terminalUI = terminalUI;
    this.storageManager = storageManager;
  }

  initializeStack() {
    this.userSessionStack = [this.config.USER.DEFAULT_NAME];
  }

  getStack() {
    return this.userSessionStack;
  }

  pushUserToStack(username) {
    this.userSessionStack.push(username);
  }

  popUserFromStack() {
    if (this.userSessionStack.length > 1) {
      return this.userSessionStack.pop();
    }
    return null;
  }

  getCurrentUserFromStack() {
    return this.userSessionStack.length > 0
        ? this.userSessionStack[this.userSessionStack.length - 1]
        : this.config.USER.DEFAULT_NAME;
  }

  clearUserStack(username) {
    this.userSessionStack = [username];
  }

  _getAutomaticSessionStateKey(user) {
    return `${this.config.STORAGE_KEYS.USER_TERMINAL_STATE_PREFIX}${user}`;
  }

  _getManualUserTerminalStateKey(user) {
    const userName =
        typeof user === "object" && user !== null && user.name
            ? user.name
            : String(user);
    return `${this.config.STORAGE_KEYS.MANUAL_TERMINAL_STATE_PREFIX}${userName}`;
  }

  saveAutomaticState(username) {
    if (!username) {
      console.warn(
          "saveAutomaticState: No username provided. State not saved."
      );
      return;
    }
    const currentInput = this.terminalUI.getCurrentInputValue();
    const autoState = {
      currentPath: this.fsManager.getCurrentPath(),
      outputHTML: this.elements.outputDiv
          ? this.elements.outputDiv.innerHTML
          : "",
      currentInput: currentInput,
      commandHistory: HistoryManager.getFullHistory(),
      environmentVariables: this.environmentManager.getAll(),
    };
    this.storageManager.saveItem(
        this._getAutomaticSessionStateKey(username),
        autoState,
        `Auto session for ${username}`
    );
  }

  loadAutomaticState(username) {
    if (!username) {
      console.warn(
          "loadAutomaticState: No username provided. Cannot load state."
      );
      if (this.elements.outputDiv) this.elements.outputDiv.innerHTML = "";
      this.terminalUI.setCurrentInputValue("");
      this.fsManager.setCurrentPath(this.config.FILESYSTEM.ROOT_PATH);
      HistoryManager.clearHistory();
      void this.outputManager.appendToOutput(
          `${this.config.MESSAGES.WELCOME_PREFIX} ${this.config.USER.DEFAULT_NAME}${this.config.MESSAGES.WELCOME_SUFFIX}`
      );
      this.terminalUI.updatePrompt();
      if (this.elements.outputDiv)
        this.elements.outputDiv.scrollTop =
            this.elements.outputDiv.scrollHeight;
      return false;
    }
    const autoState = this.storageManager.loadItem(
        this._getAutomaticSessionStateKey(username),
        `Auto session for ${username}`
    );
    if (autoState) {
      this.fsManager.setCurrentPath(
          autoState.currentPath || this.config.FILESYSTEM.ROOT_PATH
      );
      if (this.elements.outputDiv) {
        if (autoState.hasOwnProperty("outputHTML")) {
          this.elements.outputDiv.innerHTML = autoState.outputHTML || "";
        } else {
          this.elements.outputDiv.innerHTML = "";
          void this.outputManager.appendToOutput(
              `${this.config.MESSAGES.WELCOME_PREFIX} ${username}${this.config.MESSAGES.WELCOME_SUFFIX}`
          );
        }
      }
      this.terminalUI.setCurrentInputValue(autoState.currentInput || "");
      HistoryManager.setHistory(autoState.commandHistory || []);
      this.environmentManager.load(autoState.environmentVariables);
    } else {
      if (this.elements.outputDiv) this.elements.outputDiv.innerHTML = "";
      this.terminalUI.setCurrentInputValue("");
      const homePath = `/home/${username}`;
      if (this.fsManager.getNodeByPath(homePath)) {
        this.fsManager.setCurrentPath(homePath);
      } else {
        this.fsManager.setCurrentPath(this.config.FILESYSTEM.ROOT_PATH);
      }
      HistoryManager.clearHistory();

      const newEnv = {};
      newEnv["USER"] = username;
      newEnv["HOME"] = `/home/${username}`;
      newEnv["HOST"] = this.config.OS.DEFAULT_HOST_NAME;
      newEnv["PATH"] = "/bin:/usr/bin";
      this.environmentManager.load(newEnv);

      void this.outputManager.appendToOutput(
          `${this.config.MESSAGES.WELCOME_PREFIX} ${username}${this.config.MESSAGES.WELCOME_SUFFIX}`
      );
    }
    this.terminalUI.updatePrompt();
    if (this.elements.outputDiv)
      this.elements.outputDiv.scrollTop = this.elements.outputDiv.scrollHeight;
    return !!autoState;
  }

  async saveManualState() {
    const currentUser = this.userManager.getCurrentUser();
    const currentInput = this.terminalUI.getCurrentInputValue();
    const manualStateData = {
      user: currentUser.name,
      osVersion: this.config.OS.VERSION,
      timestamp: new Date().toISOString(),
      currentPath: this.fsManager.getCurrentPath(),
      outputHTML: this.elements.outputDiv
          ? this.elements.outputDiv.innerHTML
          : "",
      currentInput: currentInput,
      fsDataSnapshot: Utils.deepCopyNode(this.fsManager.getFsData()),
      commandHistory: HistoryManager.getFullHistory(),
    };
    if (
        this.storageManager.saveItem( // Use this.storageManager
            this._getManualUserTerminalStateKey(currentUser),
            manualStateData,
            `Manual save for ${currentUser.name}`
        )
    )
      return {
        success: true,
        data: {
          message: `${this.config.MESSAGES.SESSION_SAVED_FOR_PREFIX}${currentUser.name}.`,
        },
      };
    else
      return {
        success: false,
        error: "Failed to save session manually.",
      };
  }

  async loadManualState(options = {}) {
    const currentUser = this.userManager.getCurrentUser();
    const manualStateData = this.storageManager.loadItem(
        this._getManualUserTerminalStateKey(currentUser),
        `Manual save for ${currentUser.name}`
    );

    if (!manualStateData) {
      return {
        success: false,
        data: {
          message: `${this.config.MESSAGES.NO_MANUAL_SAVE_FOUND_PREFIX}${currentUser.name}.`,
        },
      };
    }

    if (manualStateData.user && manualStateData.user !== currentUser.name) {
      await this.outputManager.appendToOutput(
          `Warning: Saved state is for user '${manualStateData.user}'. Current user is '${currentUser.name}'. Load aborted. Use 'login ${manualStateData.user}' then 'loadstate'.`,
          {
            typeClass: this.config.CSS_CLASSES.WARNING_MSG,
          }
      );
      return {
        success: false,
        data: {
          message: `Saved state user mismatch. Current: ${currentUser.name}, Saved: ${manualStateData.user}.`,
        },
      };
    }

    return new Promise((resolve) => {
      ModalManager.request({
        context: "terminal",
        messageLines: [
          `Load manually saved state for '${currentUser.name}'? This overwrites current session & filesystem.`,
        ],
        onConfirm: async () => {
          this.fsManager.setFsData(
              Utils.deepCopyNode(manualStateData.fsDataSnapshot) || {
                [this.config.FILESYSTEM.ROOT_PATH]: {
                  type: this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE,
                  children: {},
                  owner: manualStateData.user,
                  mode: this.config.FILESYSTEM.DEFAULT_DIR_MODE,
                  mtime: new Date().toISOString(),
                },
              }
          );
          this.fsManager.setCurrentPath(
              manualStateData.currentPath || this.config.FILESYSTEM.ROOT_PATH
          );
          if (this.elements.outputDiv)
            this.elements.outputDiv.innerHTML =
                manualStateData.outputHTML || "";
          this.terminalUI.setCurrentInputValue(
              manualStateData.currentInput || ""
          );
          HistoryManager.setHistory(manualStateData.commandHistory || []);
          await this.fsManager.save(manualStateData.user);
          await this.outputManager.appendToOutput(
              this.config.MESSAGES.SESSION_LOADED_MSG,
              {
                typeClass: this.config.CSS_CLASSES.SUCCESS_MSG,
              }
          );
          this.terminalUI.updatePrompt();
          if (this.elements.outputDiv)
            this.elements.outputDiv.scrollTop =
                this.elements.outputDiv.scrollHeight;

          resolve({
            success: true,
            data: { message: this.config.MESSAGES.SESSION_LOADED_MSG },
          });
        },
        onCancel: () => {
          this.outputManager.appendToOutput(
              this.config.MESSAGES.LOAD_STATE_CANCELLED,
              {
                typeClass: this.config.CSS_CLASSES.CONSOLE_LOG_MSG,
              }
          );
          resolve({
            success: true,
            data: { message: this.config.MESSAGES.LOAD_STATE_CANCELLED },
          });
        },
        options,
      });
    });
  }

  clearUserSessionStates(username) {
    if (!username || typeof username !== "string") {
      console.warn(
          "SessionManager.clearUserSessionStates: Invalid username provided.",
          username
      );
      return false;
    }
    try {
      this.storageManager.removeItem(this._getAutomaticSessionStateKey(username));
      this.storageManager.removeItem(this._getManualUserTerminalStateKey(username));
      const users = this.storageManager.loadItem(
          this.config.STORAGE_KEYS.USER_CREDENTIALS,
          "User list",
          {}
      );
      if (users.hasOwnProperty(username)) {
        delete users[username];
        this.storageManager.saveItem(
            this.config.STORAGE_KEYS.USER_CREDENTIALS,
            users,
            "User list"
        );
      }
      return true;
    } catch (e) {
      console.error(`Error clearing session states for user '${username}':`, e);
      return false;
    }
  }

  async performFullReset() {
    this.outputManager.clearOutput();
    this.terminalUI.clearInput();
    const allKeys = this.storageManager.getAllLocalStorageKeys();

    const OS_KEY_PREFIX = "oopisOs";

    allKeys.forEach((key) => {
      if (key.startsWith(OS_KEY_PREFIX)) {
        this.storageManager.removeItem(key);
      }
    });

    await this.outputManager.appendToOutput(
        "All session states, credentials, aliases, groups, and editor settings cleared from local storage."
    );
    try {
      await this.fsManager.clearAllFS();
      await this.outputManager.appendToOutput(
          "All user filesystems cleared from DB."
      );
    } catch (error) {
      await this.outputManager.appendToOutput(
          `Warning: Could not fully clear all user filesystems from DB. Error: ${error.message}`,
          {
            typeClass: this.config.CSS_CLASSES.WARNING_MSG,
          }
      );
    }
    await this.outputManager.appendToOutput(
        "Reset complete. Rebooting OopisOS...",
        {
          typeClass: this.config.CSS_CLASSES.SUCCESS_MSG,
        }
    );
    this.terminalUI.setInputState(false);
    if (this.elements.inputLineContainerDiv) {
      this.elements.inputLineContainerDiv.classList.add(
          this.config.CSS_CLASSES.HIDDEN
      );
    }
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }
}