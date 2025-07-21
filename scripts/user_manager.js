// scripts/user_manager.js
class UserManager {
  constructor(config, fsManager, groupManager) {
    this.config = config;
    this.fsManager = fsManager;
    this.groupManager = groupManager;
    this.currentUser = { name: this.config.USER.DEFAULT_NAME };
    this.sessionManager = null;
    this.sudoManager = null;
    this.commandExecutor = null;
    this.modalManager = null;
    this.storageManager = null;
  }

  setDependencies(sessionManager, sudoManager, commandExecutor, modalManager, storageManager) {
    this.sessionManager = sessionManager;
    this.sudoManager = sudoManager;
    this.commandExecutor = commandExecutor;
    this.modalManager = modalManager;
    this.storageManager = storageManager;
  }

  async _secureHashPassword(password) {
    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    const saltHex = Array.from(salt)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
    const rawHash = await window.crypto.subtle.exportKey("raw", key);
    const hashHex = Array.from(new Uint8Array(rawHash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return { salt: saltHex, hash: hashHex };
  }

  async _verifyPasswordWithSalt(passwordAttempt, saltHex, storedHashHex) {
    const salt = new Uint8Array(
        saltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(passwordAttempt),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
    const rawHash = await window.crypto.subtle.exportKey("raw", key);
    const attemptHashHex = Array.from(new Uint8Array(rawHash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return (
        attemptHashHex.length === storedHashHex.length &&
        attemptHashHex.split("").every((char, i) => char === storedHashHex[i])
    );
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getPrimaryGroupForUser(username) {
    const users = this.storageManager.loadItem(
        this.config.STORAGE_KEYS.USER_CREDENTIALS,
        "User list",
        {}
    );
    return users[username]?.primaryGroup || null;
  }

  async userExists(username) {
    const users = this.storageManager.loadItem(
        this.config.STORAGE_KEYS.USER_CREDENTIALS,
        "User list",
        {}
    );
    return users.hasOwnProperty(username);
  }

  async register(username, password) {
    const formatValidation = Utils.validateUsernameFormat(username);
    if (!formatValidation.isValid) {
      return ErrorHandler.createError(formatValidation.error);
    }
    if (await this.userExists(username)) {
      return ErrorHandler.createError(`User '${username}' already exists.`);
    }
    let passwordData = null;
    if (password) {
      passwordData = await this._secureHashPassword(password);
      if (!passwordData) {
        return ErrorHandler.createError("Failed to securely process password.");
      }
    }
    this.groupManager.createGroup(username);
    this.groupManager.addUserToGroup(username, username);
    const users = this.storageManager.loadItem(
        this.config.STORAGE_KEYS.USER_CREDENTIALS,
        "User list",
        {}
    );
    users[username] = { passwordData, primaryGroup: username };
    await this.fsManager.createUserHomeDirectory(username);

    if (
        this.storageManager.saveItem(
            this.config.STORAGE_KEYS.USER_CREDENTIALS,
            users,
            "User list"
        )
    ) {
      return ErrorHandler.createSuccess(
          `User '${username}' registered. Home directory created at /home/${username}.`,
          { stateModified: true }
      );
    }
    return ErrorHandler.createError("Failed to save new user credentials.");
  }

  async _authenticateUser(username, providedPassword) {
    const users = this.storageManager.loadItem(
        this.config.STORAGE_KEYS.USER_CREDENTIALS,
        "User list",
        {}
    );
    const userEntry = users[username];
    if (
        !userEntry &&
        username !== this.config.USER.DEFAULT_NAME &&
        username !== "root"
    ) {
      return ErrorHandler.createError("Invalid username.");
    }
    const { salt, hash } = userEntry?.passwordData || {};
    if (salt && hash) {
      if (providedPassword === null) {
        return {
          success: false,
          error: "Password required.",
          requiresPasswordPrompt: true,
        };
      }
      if (!(await this._verifyPasswordWithSalt(providedPassword, salt, hash))) {
        return ErrorHandler.createError(this.config.MESSAGES.INVALID_PASSWORD);
      }
    } else if (providedPassword !== null) {
      return ErrorHandler.createError(
          "This account does not require a password."
      );
    }
    return ErrorHandler.createSuccess();
  }

  async verifyPassword(username, password) {
    const users = this.storageManager.loadItem(
        this.config.STORAGE_KEYS.USER_CREDENTIALS,
        "User list",
        {}
    );
    const userEntry = users[username];
    if (!userEntry) return ErrorHandler.createError("User not found.");
    const { salt, hash } = userEntry?.passwordData || {};
    if (!salt || !hash)
      return ErrorHandler.createError("User does not have a password set.");
    return (await this._verifyPasswordWithSalt(password, salt, hash))
        ? ErrorHandler.createSuccess()
        : ErrorHandler.createError("Incorrect password.");
  }

  async sudoExecute(commandStr, options) {
    const originalUser = this.currentUser;
    try {
      this.currentUser = { name: "root" };
      return await this.commandExecutor.processSingleCommand(
          commandStr,
          options
      );
    } catch (e) {
      return ErrorHandler.createError(
          `sudo: an unexpected error occurred during execution: ${e.message}`
      );
    } finally {
      this.currentUser = originalUser;
    }
  }

  async changePassword(
      actorUsername,
      targetUsername,
      oldPassword,
      newPassword
  ) {
    const users = this.storageManager.loadItem(
        this.config.STORAGE_KEYS.USER_CREDENTIALS,
        "User list",
        {}
    );
    if (!(await this.userExists(targetUsername))) {
      return ErrorHandler.createError(`User '${targetUsername}' not found.`);
    }
    if (actorUsername !== "root") {
      if (actorUsername !== targetUsername) {
        return ErrorHandler.createError(
            "You can only change your own password."
        );
      }
      const authResult = await this._authenticateUser(
          actorUsername,
          oldPassword
      );
      if (!authResult.success) {
        return ErrorHandler.createError("Incorrect current password.");
      }
    }
    if (!newPassword || newPassword.trim() === "") {
      return ErrorHandler.createError("New password cannot be empty.");
    }
    const newPasswordData = await this._secureHashPassword(newPassword);
    if (!newPasswordData) {
      return ErrorHandler.createError(
          "Failed to securely process new password."
      );
    }
    users[targetUsername].passwordData = newPasswordData;
    if (
        this.storageManager.saveItem(
            this.config.STORAGE_KEYS.USER_CREDENTIALS,
            users,
            "User list"
        )
    ) {
      return ErrorHandler.createSuccess(
          `Password for '${targetUsername}' updated successfully.`
      );
    }
    return ErrorHandler.createError("Failed to save updated password.");
  }

  async _handleAuthFlow(
      username,
      providedPassword,
      successCallback,
      failureMessage,
      options
  ) {
    const authResult = await this._authenticateUser(username, providedPassword);
    if (!authResult.success) {
      if (!authResult.requiresPasswordPrompt) return authResult;
      return new Promise((resolve) => {
        this.modalManager.request({
          context: "terminal",
          type: "input",
          messageLines: [this.config.MESSAGES.PASSWORD_PROMPT],
          obscured: true,
          onConfirm: async (passwordFromPrompt) => {
            const finalAuthResult = await this._authenticateUser(
                username,
                passwordFromPrompt
            );
            resolve(
                finalAuthResult.success
                    ? await successCallback(username)
                    : ErrorHandler.createError(
                        finalAuthResult.error || failureMessage
                    )
            );
          },
          onCancel: () =>
              resolve(
                  ErrorHandler.createSuccess({
                    output: this.config.MESSAGES.OPERATION_CANCELLED,
                  })
              ),
          options,
        });
      });
    }
    return await successCallback(username);
  }

  async login(username, providedPassword, options = {}) {
    const currentUserName = this.getCurrentUser().name;
    if (username === currentUserName) {
      return ErrorHandler.createSuccess({
        message: `${this.config.MESSAGES.ALREADY_LOGGED_IN_AS_PREFIX}${username}${this.config.MESSAGES.ALREADY_LOGGED_IN_AS_SUFFIX}`,
        noAction: true,
      });
    }
    if (this.sessionManager.getStack().includes(username)) {
      return ErrorHandler.createError(
          `${this.config.MESSAGES.ALREADY_LOGGED_IN_AS_PREFIX}${username}${this.config.MESSAGES.ALREADY_LOGGED_IN_AS_SUFFIX}`
      );
    }
    return this._handleAuthFlow(
        username,
        providedPassword,
        this._performLogin.bind(this),
        "Login failed.",
        options
    );
  }

  _performLogin(username) {
    if (this.currentUser.name !== this.config.USER.DEFAULT_NAME) {
      this.sessionManager.saveAutomaticState(this.currentUser.name);
      this.sudoManager.clearUserTimestamp(this.currentUser.name);
    }
    this.sessionManager.clearUserStack(username);
    this.currentUser = { name: username };
    this.sessionManager.loadAutomaticState(username);
    const homePath = `/home/${username}`;
    this.fsManager.setCurrentPath(
        this.fsManager.getNodeByPath(homePath)
            ? homePath
            : this.config.FILESYSTEM.ROOT_PATH
    );
    return ErrorHandler.createSuccess({
      message: `Logged in as ${username}.`,
      isLogin: true,
    });
  }

  async su(username, providedPassword, options = {}) {
    if (this.currentUser.name === username) {
      return ErrorHandler.createSuccess({
        message: `Already user '${username}'.`,
        noAction: true,
      });
    }
    return this._handleAuthFlow(
        username,
        providedPassword,
        this._performSu.bind(this),
        "su: Authentication failure.",
        options
    );
  }

  _performSu(username) {
    this.sessionManager.saveAutomaticState(this.currentUser.name);
    this.sessionManager.pushUserToStack(username);
    this.currentUser = { name: username };
    this.sessionManager.loadAutomaticState(username);
    const homePath = `/home/${username}`;
    this.fsManager.setCurrentPath(
        this.fsManager.getNodeByPath(homePath)
            ? homePath
            : this.config.FILESYSTEM.ROOT_PATH
    );
    return ErrorHandler.createSuccess({
      message: `Switched to user: ${username}.`,
    });
  }

  async logout() {
    const oldUser = this.currentUser.name;
    if (this.sessionManager.getStack().length <= 1) {
      return ErrorHandler.createSuccess({
        message: `Cannot log out from user '${oldUser}'. This is the only active session. Use 'login' to switch to a different user.`,
        noAction: true,
      });
    }
    this.sessionManager.saveAutomaticState(oldUser);
    this.sudoManager.clearUserTimestamp(oldUser);
    this.sessionManager.popUserFromStack();
    const newUsername = this.sessionManager.getCurrentUserFromStack();
    this.currentUser = { name: newUsername };
    this.sessionManager.loadAutomaticState(newUsername);
    const homePath = `/home/${newUsername}`;
    this.fsManager.setCurrentPath(
        this.fsManager.getNodeByPath(homePath)
            ? homePath
            : this.config.FILESYSTEM.ROOT_PATH
    );
    return ErrorHandler.createSuccess({
      message: `Logged out from ${oldUser}. Now logged in as ${newUsername}.`,
      isLogout: true,
      newUser: newUsername,
    });
  }

  async initializeDefaultUsers() {
    const users = this.storageManager.loadItem(
        this.config.STORAGE_KEYS.USER_CREDENTIALS,
        "User list",
        {}
    );
    let changesMade = false;
    if (!users["root"] || !users["root"].passwordData) {
      users["root"] = {
        passwordData: await this._secureHashPassword("mcgoopis"),
        primaryGroup: "root",
      };
      changesMade = true;
    }
    if (!users[this.config.USER.DEFAULT_NAME]) {
      users[this.config.USER.DEFAULT_NAME] = {
        passwordData: null,
        primaryGroup: this.config.USER.DEFAULT_NAME,
      };
      changesMade = true;
    }
    if (changesMade) {
      this.storageManager.saveItem(
          this.config.STORAGE_KEYS.USER_CREDENTIALS,
          users,
          "User list"
      );
    }
  }
}