// In scripts/apps/explorer/explorer_manager.js

window.ExplorerManager = class ExplorerManager extends App {
  constructor() {
    super(); // Call the App constructor
    this.currentPath = "/";
    this.expandedPaths = new Set(["/"]);
    this.moveOperation = {
      active: false,
      sourcePath: null,
    };
    this.dependencies = {}; // To be populated on enter
    this.callbacks = {};
  }

  async enter(appLayer, options = {}) {
    this.dependencies = options.dependencies; // Dependency injection
    this.callbacks = this._createCallbacks();

    const { FileSystemManager, OutputManager } = this.dependencies;
    const startPath = options.startPath || FileSystemManager.getCurrentPath();
    const pathValidation = FileSystemManager.validatePath(startPath, {
      allowMissing: false,
    });

    if (!pathValidation.success) {
      await OutputManager.appendToOutput(`explore: ${pathValidation.error}`, {
        typeClass: "text-error",
      });
      return;
    }

    const { node: startNode } = pathValidation.data;
    let initialPath = startPath;
    if (startNode.type !== "directory") {
      initialPath =
          initialPath.substring(0, initialPath.lastIndexOf("/")) || "/";
    }

    this.isActive = true;
    this.expandedPaths = new Set(["/"]);
    let parent = initialPath;
    while (parent && parent !== "/") {
      this.expandedPaths.add(parent);
      parent =
          parent.substring(0, parent.lastIndexOf("/")) ||
          (parent.includes("/") ? "/" : null);
    }

    // --- FIX: Pass 'this.dependencies' to the UI builder ---
    this.container = this.dependencies.ExplorerUI.buildLayout(this.callbacks, this.dependencies);
    this.container.setAttribute("tabindex", "-1");
    appLayer.appendChild(this.container);

    this._updateView(initialPath);
  }

  exit() {
    if (!this.isActive) return;
    const { ExplorerUI, AppLayerManager } = this.dependencies;
    if (this.moveOperation.active) {
      this._resetMoveOperation();
    }

    ExplorerUI.reset();
    AppLayerManager.hide(this);
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      if (this.moveOperation.active) {
        this.callbacks.onCancelMove();
      } else {
        this.exit();
      }
    }
  }

  _createCallbacks() {
    return {
      onExit: this.exit.bind(this),
      onTreeItemSelect: (path) => {
        if (this.moveOperation.active) {
          this.callbacks.onMove(this.moveOperation.sourcePath, path);
          return;
        }
        if (path !== "/") {
          this.expandedPaths.has(path)
              ? this.expandedPaths.delete(path)
              : this.expandedPaths.add(path);
        }
        this._updateView(path);
      },
      onMainItemActivate: async (path, type) => {
        const { CommandExecutor } = this.dependencies;
        if (type === "directory") {
          this.expandedPaths.add(path);
          this._updateView(path);
        } else {
          this.exit();
          await new Promise((resolve) => setTimeout(resolve, 50));
          await CommandExecutor.processSingleCommand(`edit "${path}"`, {
            isInteractive: true,
          });
        }
      },
      onCreateFile: (path) => {
        const { ModalManager, FileSystemManager, UserManager } = this.dependencies;
        ModalManager.request({
          context: "graphical",
          type: "input",
          messageLines: ["Enter New File Name:"],
          placeholder: "new_file.txt",
          onConfirm: async (name) => {
            if (name) {
              const newFilePath = `${path === "/" ? "" : path}/${name}`;
              const result = await FileSystemManager.createOrUpdateFile(
                  newFilePath,
                  "",
                  {
                    currentUser: UserManager.getCurrentUser().name,
                    primaryGroup: UserManager.getPrimaryGroupForUser(
                        UserManager.getCurrentUser().name
                    ),
                  }
              );
              if (result.success) {
                await FileSystemManager.save();
                this._updateView(this.currentPath);
              } else {
                alert(`Error: ${result.error}`);
              }
            }
          },
          onCancel: () => {},
        });
      },
      onCreateDirectory: (path) => {
        const { ModalManager, CommandExecutor } = this.dependencies;
        ModalManager.request({
          context: "graphical",
          type: "input",
          messageLines: ["Enter New Directory Name:"],
          placeholder: "new_directory",
          onConfirm: async (name) => {
            if (name) {
              await CommandExecutor.processSingleCommand(
                  `mkdir "${path === "/" ? "" : path}/${name}"`,
                  { isInteractive: false }
              );
              this._updateView(this.currentPath);
            }
          },
          onCancel: () => {},
        });
      },
      onRename: (path, oldName) => {
        const { ModalManager, CommandExecutor } = this.dependencies;
        ModalManager.request({
          context: "graphical",
          type: "input",
          messageLines: [`Rename "${oldName}":`],
          placeholder: oldName,
          onConfirm: async (newName) => {
            if (newName && newName !== oldName) {
              const newPath = `${this.currentPath === "/" ? "" : this.currentPath}/${newName}`;
              await CommandExecutor.processSingleCommand(
                  `mv "${path}" "${newPath}"`,
                  { isInteractive: false }
              );
              this._updateView(this.currentPath);
            }
          },
          onCancel: () => {},
        });
      },
      onDelete: (path, name) => {
        const { ModalManager, CommandExecutor } = this.dependencies;
        ModalManager.request({
          context: "graphical",
          type: "confirm",
          messageLines: [
            `Are you sure you want to delete "${name}"?`,
            "This action cannot be undone.",
          ],
          onConfirm: async () => {
            await CommandExecutor.processSingleCommand(`rm -r "${path}"`, {
              isInteractive: false,
            });
            this._updateView(this.currentPath);
          },
          onCancel: () => {},
        });
      },
      onMove: (sourcePath, destPath) => {
        const { CommandExecutor, ExplorerUI } = this.dependencies;
        if (!this.moveOperation.active) {
          this.moveOperation.active = true;
          this.moveOperation.sourcePath = sourcePath;
          ExplorerUI.setMoveCursor(true);
          ExplorerUI.highlightItem(sourcePath, true);
          return;
        }
        CommandExecutor.processSingleCommand(
            `mv "${sourcePath}" "${destPath}/"`,
            {
              isInteractive: false,
            }
        ).then(() => {
          this._resetMoveOperation();
          this._updateView(this.currentPath);
        });
      },
      onCancelMove: () => {
        this._resetMoveOperation();
        this._updateView(this.currentPath);
      },
    };
  }

  _resetMoveOperation() {
    const { ExplorerUI } = this.dependencies;
    this.moveOperation.active = false;
    this.moveOperation.sourcePath = null;
    ExplorerUI.setMoveCursor(false);
  }

  _updateView(path) {
    const { UserManager, FileSystemManager, ExplorerUI } = this.dependencies;
    this.currentPath = path;
    const currentUser = UserManager.getCurrentUser().name;
    const rootNode = FileSystemManager.getNodeByPath("/");
    if (!rootNode) {
      console.error("CRITICAL: Root node not found in ExplorerManager.");
      this.exit();
      return;
    }

    ExplorerUI.renderTree(rootNode, this.currentPath, this.expandedPaths);

    const mainNode = FileSystemManager.getNodeByPath(this.currentPath);
    if (
        mainNode &&
        FileSystemManager.hasPermission(mainNode, currentUser, "read")
    ) {
      const items = Object.keys(mainNode.children || {})
          .sort((a, b) => {
            const nodeA = mainNode.children[a];
            const nodeB = mainNode.children[b];
            if (nodeA.type === "directory" && nodeB.type !== "directory")
              return -1;
            if (nodeA.type !== "directory" && nodeB.type === "directory")
              return 1;
            return a.localeCompare(b);
          })
          .map((name) => {
            const childNode = mainNode.children[name];
            return {
              name,
              path: `${this.currentPath === "/" ? "" : this.currentPath}/${name}`,
              type: childNode.type,
              node: childNode,
              size: FileSystemManager.calculateNodeSize(childNode),
            };
          });
      ExplorerUI.renderMainPane(items, this.currentPath);
      ExplorerUI.updateStatusBar(this.currentPath, items.length);
    } else {
      ExplorerUI.renderMainPane([], this.currentPath);
      ExplorerUI.updateStatusBar(this.currentPath, "Permission Denied");
    }
  }
}