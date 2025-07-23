class FileSystemManager {
  constructor(config) {
    this.config = config;
    this.fsData = {};
    this.currentPath = this.config.FILESYSTEM.ROOT_PATH;
    this.dependencies = {};
  }

  setDependencies(dependencies) {
    this.dependencies = dependencies;
    this.userManager = dependencies.UserManager;
    this.groupManager = dependencies.GroupManager;
  }

  async initialize(guestUsername) {
    const nowISO = new Date().toISOString();
    this.fsData = {
      [this.config.FILESYSTEM.ROOT_PATH]: {
        type: this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE,
        children: {
          home: {
            type: this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE,
            children: {},
            owner: "root",
            group: "root",
            mode: 0o755,
            mtime: nowISO,
          },
          etc: {
            type: this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE,
            children: {},
            owner: "root",
            group: "root",
            mode: 0o755,
            mtime: nowISO,
          },
        },
        owner: "root",
        group: "root",
        mode: this.config.FILESYSTEM.DEFAULT_DIR_MODE,
        mtime: nowISO,
      },
    };
    await this.createUserHomeDirectory("root");
    await this.createUserHomeDirectory(guestUsername);
    const rootNode = this.fsData[this.config.FILESYSTEM.ROOT_PATH];
    if (rootNode) {
      rootNode.children["etc"] = {
        type: this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE,
        children: {},
        owner: "root",
        group: "root",
        mode: 0o755,
        mtime: nowISO,
      };
      rootNode.mtime = nowISO;

      const etcNode = rootNode.children["etc"];
      if (etcNode) {
        etcNode.children["oopis.conf"] = {
          type: this.config.FILESYSTEM.DEFAULT_FILE_TYPE,
          content: this.OOPIS_CONF_CONTENT,
          owner: "root",
          group: "root",
          mode: 0o644,
          mtime: nowISO,
        };
        etcNode.mtime = nowISO;
      } else {
        console.error("FileSystemManager: Failed to create /etc directory.");
      }
    } else {
      console.error(
          "FileSystemManager: Root node not found during initialization. Critical error."
      );
    }
  }

  async createUserHomeDirectory(username) {
    if (!this.fsData["/"]?.children?.home) {
      console.error(
          "FileSystemManager: Cannot create user home directory, /home does not exist."
      );
      return;
    }
    const homeDirNode = this.fsData["/"].children.home;
    if (!homeDirNode.children[username]) {
      homeDirNode.children[username] = {
        type: this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE,
        children: {},
        owner: username,
        group: username,
        mode: 0o700,
        mtime: new Date().toISOString(),
      };
      homeDirNode.mtime = new Date().toISOString();
    }
  }

  async save() {
    const { IndexedDBManager, ErrorHandler, Utils } = this.dependencies;
    let db;
    try {
      db = IndexedDBManager.getDbInstance();
    } catch (e) {
      return ErrorHandler.createError(
          "File system storage not available for saving."
      );
    }

    return new Promise((resolve) => {
      const transaction = db.transaction(
          [this.config.DATABASE.FS_STORE_NAME],
          "readwrite"
      );
      const store = transaction.objectStore(this.config.DATABASE.FS_STORE_NAME);
      const request = store.put({
        id: this.config.DATABASE.UNIFIED_FS_KEY,
        data: Utils.deepCopyNode(this.fsData),
      });
      request.onsuccess = () => resolve(ErrorHandler.createSuccess());
      request.onerror = (event) => {
        resolve(
            ErrorHandler.createError(
                `OopisOs failed to save the file system: ${event.target.error}`
            )
        );
      };
    });
  }

  async load() {
    const { IndexedDBManager, ErrorHandler, OutputManager } = this.dependencies;
    let db;
    try {
      db = IndexedDBManager.getDbInstance();
    } catch (e) {
      await this.initialize(this.config.USER.DEFAULT_NAME);
      return ErrorHandler.createError(
          this.config.INTERNAL_ERRORS.DB_NOT_INITIALIZED_FS_LOAD
      );
    }
    return new Promise(async (resolve) => {
      const transaction = db.transaction(
          [this.config.DATABASE.FS_STORE_NAME],
          "readonly"
      );
      const store = transaction.objectStore(this.config.DATABASE.FS_STORE_NAME);
      const request = store.get(this.config.DATABASE.UNIFIED_FS_KEY);
      request.onsuccess = async (event) => {
        const result = event.target.result;
        if (result && result.data) {
          this.fsData = result.data;
        } else {
          await OutputManager.appendToOutput(
              "No file system found. Initializing new one.",
              {
                typeClass: this.config.CSS_CLASSES.CONSOLE_LOG_MSG,
              }
          );
          await this.initialize(this.config.USER.DEFAULT_NAME);
          await this.save();
        }
        resolve(ErrorHandler.createSuccess());
      };
      request.onerror = async (event) => {
        await this.initialize(this.config.USER.DEFAULT_NAME);
        resolve(ErrorHandler.createError(event.target.error));
      };
    });
  }

  async clearAllFS() {
    const { IndexedDBManager, ErrorHandler } = this.dependencies;
    let db;
    try {
      db = IndexedDBManager.getDbInstance();
    } catch (e) {
      return ErrorHandler.createError(
          "File system storage not available for clearing all data."
      );
    }
    return new Promise((resolve) => {
      const transaction = db.transaction(
          [this.config.DATABASE.FS_STORE_NAME],
          "readwrite"
      );
      const store = transaction.objectStore(this.config.DATABASE.FS_STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve(ErrorHandler.createSuccess());
      request.onerror = (event) => {
        console.error("Error clearing FileSystemsStore:", event.target.error);
        resolve(
            ErrorHandler.createError(
                `Could not clear all user file systems: ${event.target.error}`
            )
        );
      };
    });
  }

  getCurrentPath() {
    return this.currentPath;
  }

  setCurrentPath(path) {
    this.currentPath = path;
  }

  getFsData() {
    return this.fsData;
  }

  setFsData(newData) {
    this.fsData = newData;
  }

  getAbsolutePath(targetPath, basePath) {
    basePath = basePath || this.currentPath;
    if (!targetPath) targetPath = this.config.FILESYSTEM.CURRENT_DIR_SYMBOL;
    let effectiveBasePath = basePath;
    if (targetPath.startsWith(this.config.FILESYSTEM.PATH_SEPARATOR))
      effectiveBasePath = this.config.FILESYSTEM.ROOT_PATH;
    const baseSegments =
        effectiveBasePath === this.config.FILESYSTEM.ROOT_PATH
            ? []
            : effectiveBasePath
                .substring(1)
                .split(this.config.FILESYSTEM.PATH_SEPARATOR)
                .filter((s) => s && s !== this.config.FILESYSTEM.CURRENT_DIR_SYMBOL);
    let resolvedSegments = [...baseSegments];
    const targetSegments = targetPath.split(this.config.FILESYSTEM.PATH_SEPARATOR);
    for (const segment of targetSegments) {
      if (segment === "" || segment === this.config.FILESYSTEM.CURRENT_DIR_SYMBOL) {
        if (
            targetPath.startsWith(this.config.FILESYSTEM.PATH_SEPARATOR) &&
            resolvedSegments.length === 0 &&
            segment === ""
        ) {
        }
        continue;
      }
      if (segment === this.config.FILESYSTEM.PARENT_DIR_SYMBOL) {
        if (resolvedSegments.length > 0) resolvedSegments.pop();
      } else resolvedSegments.push(segment);
    }
    if (resolvedSegments.length === 0) return this.config.FILESYSTEM.ROOT_PATH;
    return (
        this.config.FILESYSTEM.PATH_SEPARATOR +
        resolvedSegments.join(this.config.FILESYSTEM.PATH_SEPARATOR)
    );
  }

  _createNewSymlinkNode(targetPath, owner, group) {
    return {
      type: this.config.FILESYSTEM.SYMBOLIC_LINK_TYPE,
      target: targetPath, // The path the link points to
      owner: owner,
      group: group,
      mode: 0o777, // Symlinks typically have open permissions
      mtime: new Date().toISOString()
    };
  }

  getNodeByPath(absolutePath, visited = new Set()) {
    if (visited.has(absolutePath)) {
      // Loop detected
      return null;
    }
    visited.add(absolutePath);

    const currentUser = this.dependencies.UserManager.getCurrentUser().name;
    if (absolutePath === this.config.FILESYSTEM.ROOT_PATH) {
      return this.fsData[this.config.FILESYSTEM.ROOT_PATH];
    }
    const segments = absolutePath
        .substring(1)
        .split(this.config.FILESYSTEM.PATH_SEPARATOR)
        .filter((s) => s);
    let currentNode = this.fsData[this.config.FILESYSTEM.ROOT_PATH];
    for (const segment of segments) {
      if (!this.hasPermission(currentNode, currentUser, "execute")) {
        return null; // Permission denied during traversal
      }
      if (!currentNode.children || !currentNode.children[segment]) {
        return null; // Path does not exist
      }
      currentNode = currentNode.children[segment];
      if (currentNode.type === this.config.FILESYSTEM.SYMBOLIC_LINK_TYPE) {
        const targetPath = this.getAbsolutePath(currentNode.target, this.currentPath);
        return this.getNodeByPath(targetPath, visited);
      }
    }
    return currentNode;
  }

  validatePath(pathArg, options = {}) {
    const { ErrorHandler } = this.dependencies;
    const {
      expectedType = null,
      permissions = [],
      allowMissing = false,
    } = options;
    const currentUser = this.dependencies.UserManager.getCurrentUser().name;

    const resolvedPath = this.getAbsolutePath(pathArg);

    const node = this.getNodeByPath(resolvedPath);

    if (!node) {
      if (allowMissing) {
        return ErrorHandler.createSuccess({ node: null, resolvedPath });
      }
      return ErrorHandler.createError(`${pathArg}: No such file or directory`);
    }

    if (expectedType && node.type !== expectedType) {
      if (expectedType === "file") {
        return ErrorHandler.createError(`${pathArg}: Is not a file`);
      }
      if (expectedType === "directory") {
        return ErrorHandler.createError(`${pathArg}: Is not a directory`);
      }
    }

    for (const perm of permissions) {
      if (!this.hasPermission(node, currentUser, perm)) {
        return ErrorHandler.createError(`${pathArg}: Permission denied`);
      }
    }

    return ErrorHandler.createSuccess({ node, resolvedPath });
  }

  calculateNodeSize(node) {
    if (!node) return 0;
    if (node.type === this.config.FILESYSTEM.DEFAULT_FILE_TYPE)
      return (node.content || "").length;
    if (node.type === this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE) {
      let totalSize = 0;
      for (const childName in node.children)
        totalSize += this.calculateNodeSize(node.children[childName]);
      return totalSize;
    }
    return 0;
  }

  _updateNodeAndParentMtime(nodePath, nowISO) {
    if (!nodePath || !nowISO) return;
    const node = this.getNodeByPath(nodePath);
    if (node) node.mtime = nowISO;
    if (nodePath !== this.config.FILESYSTEM.ROOT_PATH) {
      const parentPath =
          nodePath.substring(
              0,
              nodePath.lastIndexOf(this.config.FILESYSTEM.PATH_SEPARATOR)
          ) || this.config.FILESYSTEM.ROOT_PATH;
      const parentNode = this.getNodeByPath(parentPath);
      if (
          parentNode &&
          parentNode.type === this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE
      )
        parentNode.mtime = nowISO;
    }
  }

  createParentDirectoriesIfNeeded(fullPath) {
    const { ErrorHandler } = this.dependencies;
    const currentUserForCPDIF = this.dependencies.UserManager.getCurrentUser().name;
    const nowISO = new Date().toISOString();
    if (fullPath === this.config.FILESYSTEM.ROOT_PATH) {
      return ErrorHandler.createError(
          "Cannot create directory structure for root."
      );
    }
    const lastSlashIndex = fullPath.lastIndexOf(
        this.config.FILESYSTEM.PATH_SEPARATOR
    );
    const parentPathForSegments =
        lastSlashIndex === 0
            ? this.config.FILESYSTEM.ROOT_PATH
            : fullPath.substring(0, lastSlashIndex);
    if (parentPathForSegments === this.config.FILESYSTEM.ROOT_PATH) {
      return ErrorHandler.createSuccess(
          this.fsData[this.config.FILESYSTEM.ROOT_PATH]
      );
    }
    const segmentsToCreate = parentPathForSegments
        .substring(1)
        .split(this.config.FILESYSTEM.PATH_SEPARATOR)
        .filter((s) => s);
    let currentParentNode = this.fsData[this.config.FILESYSTEM.ROOT_PATH];
    let currentProcessedPath = this.config.FILESYSTEM.ROOT_PATH;
    if (
        !currentParentNode ||
        typeof currentParentNode.owner === "undefined" ||
        typeof currentParentNode.mode === "undefined"
    ) {
      return ErrorHandler.createError(
          "Internal error: Root FS node is malformed."
      );
    }
    for (const segment of segmentsToCreate) {
      if (
          !currentParentNode.children ||
          typeof currentParentNode.children !== "object"
      ) {
        const errorMsg = `Internal error: currentParentNode.children is not an object at path "${currentProcessedPath}" for segment "${segment}". FS may be corrupted.`;
        console.error(errorMsg, currentParentNode);
        return ErrorHandler.createError(errorMsg);
      }
      if (!currentParentNode.children[segment]) {
        if (
            !this.hasPermission(currentParentNode, currentUserForCPDIF, "write")
        ) {
          const errorMsg = `Cannot create directory '${segment}' in '${currentProcessedPath}'${this.config.MESSAGES.PERMISSION_DENIED_SUFFIX}`;
          return ErrorHandler.createError(errorMsg);
        }
        currentParentNode.children[segment] = {
          type: this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE,
          children: {},
          owner: currentUserForCPDIF,
          group: currentUserForCPDIF,
          mode: this.config.FILESYSTEM.DEFAULT_DIR_MODE,
          mtime: nowISO,
        };
        currentParentNode.mtime = nowISO;
      } else if (
          currentParentNode.children[segment].type !==
          this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE
      ) {
        const errorMsg = `Path component '${this.getAbsolutePath(
            segment,
            currentProcessedPath
        )}' is not a directory.`;
        return ErrorHandler.createError(errorMsg);
      }
      currentParentNode = currentParentNode.children[segment];
      currentProcessedPath = this.getAbsolutePath(
          segment,
          currentProcessedPath
      );
      if (
          !currentParentNode ||
          typeof currentParentNode.owner === "undefined" ||
          typeof currentParentNode.mode === "undefined"
      )
        return ErrorHandler.createError(
            `Internal error: Node for "${currentProcessedPath}" became malformed during parent creation.`
        );
    }
    return ErrorHandler.createSuccess(currentParentNode);
  }

  hasPermission(node, username, permissionType) {
    if (username === "root") {
      return true;
    }

    if (!node) {
      return false;
    }

    const permissionMap = {
      read: 4,
      write: 2,
      execute: 1,
    };

    const requiredPerm = permissionMap[permissionType];
    if (!requiredPerm) {
      console.error(`Unknown permissionType requested: ${permissionType}`);
      return false;
    }

    const mode = node.mode || 0;
    const ownerPerms = (mode >> 6) & 7;
    const groupPerms = (mode >> 3) & 7;
    const otherPerms = mode & 7;

    if (node.owner === username) {
      return (ownerPerms & requiredPerm) === requiredPerm;
    }

    const userGroups = this.dependencies.GroupManager.getGroupsForUser(username);
    if (userGroups.includes(node.group)) {
      return (groupPerms & requiredPerm) === requiredPerm;
    }

    return (otherPerms & requiredPerm) === requiredPerm;
  }

  formatModeToString(node) {
    if (!node || typeof node.mode !== "number") {
      return "----------";
    }
    const typeChar =
        node.type === this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE ? "d" : "-";

    const ownerPerms = (node.mode >> 6) & 7;
    const groupPerms = (node.mode >> 3) & 7;
    const otherPerms = node.mode & 7;

    const perm_str = (permValue) => {
      let str = "";
      let p_copy = permValue;

      if (p_copy >= 4) {
        str += "r";
        p_copy -= 4;
      } else {
        str += "-";
      }
      if (p_copy >= 2) {
        str += "w";
        p_copy -= 2;
      } else {
        str += "-";
      }
      if (p_copy >= 1) {
        str += "x";
      } else {
        str += "-";
      }
      return str;
    };

    return (
        typeChar +
        perm_str(ownerPerms) +
        perm_str(groupPerms) +
        perm_str(otherPerms)
    );
  }

  async deleteNodeRecursive(path, options = {}) {
    const { ErrorHandler } = this.dependencies;
    const { force = false, currentUser } = options;
    const pathValidationResult = this.validatePath(path, {
      disallowRoot: true,
    });
    if (!pathValidationResult.success) {
      if (force && !pathValidationResult.data?.node) {
        return ErrorHandler.createSuccess({ messages: [] });
      }
      return ErrorHandler.createError({
        messages: [pathValidationResult.error],
      });
    }
    const { node, resolvedPath } = pathValidationResult.data;
    const parentPath =
        resolvedPath.substring(
            0,
            resolvedPath.lastIndexOf(this.config.FILESYSTEM.PATH_SEPARATOR)
        ) || this.config.FILESYSTEM.ROOT_PATH;
    const parentNode = this.getNodeByPath(parentPath);
    const itemName = resolvedPath.substring(
        resolvedPath.lastIndexOf(this.config.FILESYSTEM.PATH_SEPARATOR) + 1
    );
    const nowISO = new Date().toISOString();
    let messages = [];
    let anyChangeMade = false;
    if (!parentNode || !this.hasPermission(parentNode, currentUser, "write")) {
      const permError = `cannot remove '${path}'${this.config.MESSAGES.PERMISSION_DENIED_SUFFIX}`;
      return ErrorHandler.createError({ messages: force ? [] : [permError] });
    }
    if (node.type === this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE) {
      if (node.children && typeof node.children === "object") {
        const childrenNames = Object.keys(node.children);
        for (const childName of childrenNames) {
          const childPath = this.getAbsolutePath(childName, resolvedPath);
          const result = await this.deleteNodeRecursive(childPath, options);
          if (!result.success) {
            messages.push(...result.error.messages);
            return ErrorHandler.createError({ messages });
          }
        }
      } else {
        console.warn(
            `FileSystemManager: Directory node at '${path}' is missing or has an invalid 'children' property.`,
            node
        );
      }
    }
    delete parentNode.children[itemName];
    parentNode.mtime = nowISO;
    anyChangeMade = true;
    return ErrorHandler.createSuccess({ messages, anyChangeMade });
  }

  _createNewFileNode(name, content, owner, group, mode = null) {
    const nowISO = new Date().toISOString();
    return {
      type: this.config.FILESYSTEM.DEFAULT_FILE_TYPE,
      content: content || "",
      owner: owner,
      group: group,
      mode: mode !== null ? mode : this.config.FILESYSTEM.DEFAULT_FILE_MODE,
      mtime: nowISO,
    };
  }

  _calculateTotalSize() {
    if (!this.fsData || !this.fsData[this.config.FILESYSTEM.ROOT_PATH]) return 0;
    return this.calculateNodeSize(this.fsData[this.config.FILESYSTEM.ROOT_PATH]);
  }

  _willOperationExceedQuota(changeInBytes) {
    const currentSize = this._calculateTotalSize();
    return currentSize + changeInBytes > this.config.FILESYSTEM.MAX_VFS_SIZE;
  }

  _createNewDirectoryNode(owner, group, mode = null) {
    const nowISO = new Date().toISOString();
    return {
      type: this.config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE,
      children: {},
      owner: owner,
      group: group,
      mode: mode !== null ? mode : this.config.FILESYSTEM.DEFAULT_DIR_MODE,
      mtime: nowISO,
    };
  }

  async createOrUpdateFile(absolutePath, content, context) {
    const { ErrorHandler } = this.dependencies;
    const {
      currentUser,
      primaryGroup,
      isDirectory = false,
    } = context;
    const nowISO = new Date().toISOString();

    // Handle directory creation as a special case first.
    if (isDirectory) {
      const parentDirResult = this.createParentDirectoriesIfNeeded(absolutePath);
      if (!parentDirResult.success) {
        return parentDirResult;
      }
      const parentNode = parentDirResult.data;
      if (!this.hasPermission(parentNode, currentUser, "write")) {
        return ErrorHandler.createError(`Cannot create directory in parent: Permission denied`);
      }
      const dirName = absolutePath.substring(absolutePath.lastIndexOf("/") + 1);
      if (parentNode.children && !parentNode.children[dirName]) {
        parentNode.children[dirName] = this._createNewDirectoryNode(currentUser, primaryGroup);
        parentNode.mtime = nowISO;
      }
      return ErrorHandler.createSuccess();
    }


    const existingNode = this.getNodeByPath(absolutePath);
    const changeInBytes = (content || "").length - (existingNode?.content?.length || 0);

    if (this._willOperationExceedQuota(changeInBytes)) {
      return ErrorHandler.createError(
          `Disk quota exceeded. Cannot write ${content.length} bytes.`
      );
    }

    if (existingNode) {
      if (existingNode.type !== this.config.FILESYSTEM.DEFAULT_FILE_TYPE) {
        return ErrorHandler.createError(
            `Cannot overwrite non-file '${absolutePath}'`
        );
      }
      if (!this.hasPermission(existingNode, currentUser, "write")) {
        return ErrorHandler.createError(`'${absolutePath}': Permission denied`);
      }
      existingNode.content = content;
      existingNode.mtime = nowISO;
    } else {
      const parentDirResult =
          this.createParentDirectoriesIfNeeded(absolutePath);
      if (!parentDirResult.success) {
        return parentDirResult;
      }
      const parentNode = parentDirResult.data;

      if (!parentNode) {
        return ErrorHandler.createError(
            `Could not find or create parent directory for '${absolutePath}'.`
        );
      }

      if (!this.hasPermission(parentNode, currentUser, "write")) {
        return ErrorHandler.createError(
            `Cannot create file in parent directory: Permission denied`
        );
      }

      if (!parentNode.children || typeof parentNode.children !== "object") {
        console.error(
            `FileSystemManager: Corrupted directory node at parent of '${absolutePath}'. Missing 'children' property. Restoring it.`,
            parentNode
        );
        parentNode.children = {};
      }

      const fileName = absolutePath.substring(
          absolutePath.lastIndexOf(this.config.FILESYSTEM.PATH_SEPARATOR) + 1
      );
      parentNode.children[fileName] = this._createNewFileNode(
          fileName,
          content,
          currentUser,
          primaryGroup
      );
      parentNode.mtime = nowISO;
    }

    return ErrorHandler.createSuccess();
  }

  canUserModifyNode(node, username) {
    return username === "root" || node.owner === username;
  }

  async prepareFileOperation(sourcePathArgs, destPathArg, options = {}) {
    const { ErrorHandler } = this.dependencies;
    const { isCopy = false, isMove = false } = options;

    const destValidationResult = this.validatePath(destPathArg, {
      allowMissing: true,
    });
    if (
        !destValidationResult.success &&
        destValidationResult.data?.node === undefined
    ) {
      return ErrorHandler.createError(
          `target '${destPathArg}': ${destValidationResult.error}`
      );
    }
    const isDestADirectory =
        destValidationResult.data.node &&
        destValidationResult.data.node.type === "directory";

    if (sourcePathArgs.length > 1 && !isDestADirectory) {
      return ErrorHandler.createError(
          `target '${destPathArg}' is not a directory`
      );
    }

    const operationsPlan = [];
    for (const sourcePath of sourcePathArgs) {
      let sourceValidationResult;
      if (isCopy) {
        sourceValidationResult = this.validatePath(sourcePath, {
          permissions: ["read"],
        });
      } else {
        sourceValidationResult = this.validatePath(sourcePath);
        if (sourceValidationResult.success) {
          const sourceParentPath =
              sourceValidationResult.data.resolvedPath.substring(
                  0,
                  sourceValidationResult.data.resolvedPath.lastIndexOf("/")
              ) || "/";
          const parentValidation = this.validatePath(sourceParentPath, {
            permissions: ["write"],
          });
          if (!parentValidation.success) {
            return ErrorHandler.createError(
                `cannot move '${sourcePath}', permission denied in source directory`
            );
          }
        }
      }

      if (!sourceValidationResult.success) {
        return ErrorHandler.createError(
            `${sourcePath}: ${sourceValidationResult.error}`
        );
      }

      const { node: sourceNode, resolvedPath: sourceAbsPath } =
          sourceValidationResult.data;

      let destinationAbsPath;
      let finalName;
      let destinationParentNode;

      if (isDestADirectory) {
        finalName = sourceAbsPath.substring(sourceAbsPath.lastIndexOf("/") + 1);
        destinationAbsPath = this.getAbsolutePath(
            finalName,
            destValidationResult.data.resolvedPath
        );
        destinationParentNode = destValidationResult.data.node;
      } else {
        finalName = destValidationResult.data.resolvedPath.substring(
            destValidationResult.data.resolvedPath.lastIndexOf("/") + 1
        );
        destinationAbsPath = destValidationResult.data.resolvedPath;
        const destParentPath =
            destinationAbsPath.substring(
                0,
                destinationAbsPath.lastIndexOf("/")
            ) || "/";
        const destParentValidation = this.validatePath(destParentPath, {
          expectedType: "directory",
          permissions: ["write"],
        });
        if (!destParentValidation.success) {
          return ErrorHandler.createError(destParentValidation.error);
        }
        destinationParentNode = destParentValidation.data.node;
      }

      const willOverwrite = !!destinationParentNode.children[finalName];

      if (isDestADirectory) {
        const parentValidation = this.validatePath(
            destValidationResult.data.resolvedPath,
            { permissions: ["write"] }
        );
        if (!parentValidation.success) {
          return ErrorHandler.createError(parentValidation.error);
        }
      }

      if (isMove) {
        if (sourceAbsPath === "/") {
          return ErrorHandler.createError("cannot move root directory");
        }
        if (
            sourceNode.type === "directory" &&
            destinationAbsPath.startsWith(sourceAbsPath + "/")
        ) {
          return ErrorHandler.createError(
              `cannot move '${sourcePath}' to a subdirectory of itself, '${destinationAbsPath}'`
          );
        }
      }

      operationsPlan.push({
        sourceNode,
        sourceAbsPath,
        destinationAbsPath,
        destinationParentNode,
        finalName,
        willOverwrite,
      });
    }

    return ErrorHandler.createSuccess(operationsPlan);
  }
}
