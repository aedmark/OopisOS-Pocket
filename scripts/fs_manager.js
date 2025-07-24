// scripts/fs_manager.js

class FileSystemManager {
  constructor(dependencies = {}) {
    this.dependencies = dependencies;
    this.fsData = {};
    this.currentPath = null;
    this.eventListeners = {};
  }

  setDependencies(dependencies) {
    this.dependencies = { ...this.dependencies, ...dependencies };
    this.storageHAL = this.dependencies.StorageHAL;
    this.config = this.dependencies.Config;
  }

  on(eventName, listener) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(listener);
  }

  emit(eventName, ...args) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach((listener) => listener(...args));
    }
  }

  async initialize(username) {
    const { GroupManager, UserManager, ErrorHandler } = this.dependencies;

    // Create the root directory
    this.fsData = {
      name: "",
      type: "d",
      owner: "root",
      group: "root",
      permissions: "rwxr-xr-x",
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      children: {},
    };

    // Create /home
    const homeDir = {
      name: "home",
      type: "d",
      owner: "root",
      group: "root",
      permissions: "rwxr-xr-x",
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      children: {},
    };
    this.fsData.children["home"] = homeDir;

    // Create the user's home directory e.g., /home/user
    if (username) {
      const user = await UserManager.getUser(username);
      const userGroup = await GroupManager.getGroup(user.primary_group);

      const userHomeDir = {
        name: username,
        type: "d",
        owner: username,
        group: userGroup ? userGroup.name : "users",
        permissions: "rwx------",
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        children: {},
      };
      homeDir.children[username] = userHomeDir;
      this.currentPath = `/home/${username}`;
    } else {
      this.currentPath = "/";
    }

    return ErrorHandler.createSuccess();
  }

  getNodeByPath(path, startNode = this.fsData) {
    if (path === "/") return startNode;
    const parts = path.split("/").filter(Boolean);
    let currentNode = startNode;
    for (const part of parts) {
      if (
          !currentNode ||
          currentNode.type !== "d" ||
          !currentNode.children[part]
      ) {
        return null;
      }
      currentNode = currentNode.children[part];
    }
    return currentNode;
  }

  validatePath(path) {
    if (!path || typeof path !== "string") return false;
    const regex =
        /^(\/|(\/[a-zA-Z0-9_.-]+)+(?!.*\/$)|(\/[a-zA-Z0-9_.-]+)*\/?)$/;
    if (!regex.test(path)) return false;
    const parts = path.split("/").filter(Boolean);
    const reservedNames = [".", ".."];
    for (const part of parts) {
      if (reservedNames.includes(part)) return false;
    }
    return true;
  }

  async save() {
    const { ErrorHandler, Utils } = this.dependencies;
    const success = await this.storageHAL.setItem(
        this.config.DATABASE.UNIFIED_FS_KEY,
        Utils.deepCopyNode(this.fsData)
    );

    if (success) {
      return ErrorHandler.createSuccess("File system saved successfully via HAL.");
    }
    return ErrorHandler.createError("OopisOs failed to save the file system via HAL.");
  }

  async load() {
    const { ErrorHandler, OutputManager } = this.dependencies;
    const loadedData = await this.storageHAL.getItem(this.config.DATABASE.UNIFIED_FS_KEY);

    if (loadedData) {
      this.fsData = loadedData;
    } else {
      await OutputManager.appendToOutput(
          "No file system found. Initializing new one.",
          { typeClass: this.config.CSS_CLASSES.CONSOLE_LOG_MSG }
      );
      await this.initialize(this.config.USER.DEFAULT_NAME);
      await this.save();
    }
    return ErrorHandler.createSuccess();
  }

  async clearAllFS() {
    await this.storageHAL.clear();
    console.log("Cleared file system via HAL.");
  }

  getCurrentPath() {
    return this.currentPath || "/";
  }

  setCurrentPath(path) {
    if (this.validatePath(path)) {
      const node = this.getNodeByPath(path);
      if (node && node.type === "d") {
        this.currentPath = path;
        this.emit("pathChanged", this.currentPath);
        return true;
      }
    }
    return false;
  }
}