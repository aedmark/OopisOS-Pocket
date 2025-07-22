// scripts/commands/unzip.js
(() => {
  "use strict";

  const MAX_EXTRACTION_DEPTH = 100;

  async function _extractChildren(
      children,
      parentPath,
      context,
      baseExtractionPath,
      currentDepth,
      dependencies
  ) {
    const { ErrorHandler, FileSystemManager, CommandExecutor } = dependencies;
    if (currentDepth > MAX_EXTRACTION_DEPTH) {
      return ErrorHandler.createError(
          "Archive nesting level exceeds maximum depth."
      );
    }

    for (const name in children) {
      const node = children[name];
      const newPath = FileSystemManager.getAbsolutePath(name, parentPath);

      if (!newPath.startsWith(baseExtractionPath)) {
        return ErrorHandler.createError(`Path traversal attempt detected.`);
      }

      if (node.type === "file") {
        const saveResult = await FileSystemManager.createOrUpdateFile(
            newPath,
            node.content,
            context
        );
        if (!saveResult.success) return saveResult;
      } else if (node.type === "directory") {
        const mkdirResult = await CommandExecutor.processSingleCommand(
            `mkdir -p "${newPath}"`,
            { isInteractive: false }
        );
        if (!mkdirResult.success) {
          return ErrorHandler.createError(
              `Could not create directory ${newPath}: ${mkdirResult.error}`
          );
        }
        const recursiveResult = await _extractChildren(
            node.children,
            newPath,
            context,
            baseExtractionPath,
            currentDepth + 1,
            dependencies
        );
        if (!recursiveResult.success) return recursiveResult;
      }
    }
    return ErrorHandler.createSuccess();
  }

  async function _performExtraction(archive, destinationPath, context, dependencies) {
    const { ErrorHandler, FileSystemManager, CommandExecutor } = dependencies;
    for (const name in archive) {
      const node = archive[name];
      const newPath = FileSystemManager.getAbsolutePath(name, destinationPath);

      if (!newPath.startsWith(destinationPath)) {
        return ErrorHandler.createError(`Path traversal attempt detected.`);
      }

      if (node.type === "file") {
        const saveResult = await FileSystemManager.createOrUpdateFile(
            newPath,
            node.content,
            context
        );
        if (!saveResult.success) return saveResult;
      } else if (node.type === "directory") {
        const mkdirResult = await CommandExecutor.processSingleCommand(
            `mkdir -p "${newPath}"`,
            { isInteractive: false }
        );
        if (!mkdirResult.success) {
          return ErrorHandler.createError(
              `Could not create directory ${newPath}: ${mkdirResult.error}`
          );
        }
        const childrenResult = await _extractChildren(
            node.children,
            newPath,
            context,
            newPath,
            1,
            dependencies
        );
        if (!childrenResult.success) return childrenResult;
      }
    }
    return ErrorHandler.createSuccess();
  }

    class UnzipCommand extends Command {
    constructor() {
      super({
      commandName: "unzip",
      description: "Extracts files from a .zip archive.",
      helpText: `Usage: unzip <archive.zip> [destination]
      Extracts a simulated .zip archive created by the 'zip' command.
      DESCRIPTION
      The unzip command extracts the files and directories from
      <archive.zip> into the specified [destination] directory.
      If no destination is provided, it extracts to the current
      directory.
      EXAMPLES
      unzip my_project.zip
      Extracts the archive into the current directory.
      unzip my_project.zip /home/Guest/backups/
      Extracts the archive into the 'backups' directory.`,
      completionType: "paths",
      argValidation: {
      min: 1,
      max: 2,
      error: "Usage: unzip <archive.zip> [destination_path]",
      },
      });
    }

    async coreLogic(context) {
      
            const { args, currentUser, dependencies } = context;
            const { ErrorHandler, FileSystemManager, OutputManager, UserManager, CommandExecutor } = dependencies;
            const archivePathArg = args[0];
            const destinationPathArg = args.length > 1 ? args[1] : ".";
      
            if (!archivePathArg.endsWith(".zip")) {
              return ErrorHandler.createError(
                  `unzip: invalid file extension for '${archivePathArg}'. Must be .zip`
              );
            }
      
            const archiveValidationResult = FileSystemManager.validatePath(
                archivePathArg,
                {
                  expectedType: "file",
                  permissions: ["read"],
                }
            );
            if (!archiveValidationResult.success) {
              return ErrorHandler.createError(
                  `unzip: ${archiveValidationResult.error}`
              );
            }
            const archiveNode = archiveValidationResult.data.node;
      
            let archiveContent;
            try {
              archiveContent = JSON.parse(archiveNode.content);
            } catch (e) {
              return ErrorHandler.createError(
                  `unzip: Archive is corrupted or not a valid .zip file.`
              );
            }
      
            const destValidationResult = FileSystemManager.validatePath(
                destinationPathArg,
                {
                  allowMissing: true,
                  expectedType: "directory",
                }
            );
      
            if (
                !destValidationResult.success &&
                destValidationResult.data?.node !== null
            ) {
              return ErrorHandler.createError(
                  `unzip: ${destValidationResult.error}`
              );
            }
      
            const resolvedDestPath = destValidationResult.data.resolvedPath;
      
            if (!destValidationResult.data.node) {
              const mkdirResult = await CommandExecutor.processSingleCommand(
                  `mkdir -p "${resolvedDestPath}"`,
                  { isInteractive: false }
              );
              if (!mkdirResult.success) {
                return ErrorHandler.createError(
                    `unzip: could not create destination directory: ${mkdirResult.error}`
                );
              }
            }
      
            await OutputManager.appendToOutput(
                `Extracting archive '${archivePathArg}'...`
            );
      
            const extractionContext = {
              currentUser,
              primaryGroup: UserManager.getPrimaryGroupForUser(currentUser),
            };
      
            const extractResult = await _performExtraction(
                archiveContent,
                resolvedDestPath,
                extractionContext,
                dependencies
            );
      
            if (!extractResult.success) {
              return ErrorHandler.createError(
                  `unzip: extraction failed. ${extractResult.error}`
              );
            }
      
            return ErrorHandler.createSuccess(
                `Archive '${archivePathArg}' successfully extracted to '${resolvedDestPath}'.`,
                { stateModified: true }
            );
          
    }
  }

  CommandRegistry.register(new UnzipCommand());
})();