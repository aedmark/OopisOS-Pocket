// scripts/commands/unzip.js
async function _restoreNode(name, data, parentPath, dependencies, currentUser) {
    const { FileSystemManager, UserManager, Config } = dependencies;
    const currentPath = `${parentPath}${parentPath === "/" ? "" : "/"}${name}`;
    const primaryGroup = UserManager.getPrimaryGroupForUser(currentUser);

    if (data.type === Config.FILESYSTEM.DEFAULT_FILE_TYPE) {
        await FileSystemManager.createOrUpdateFile(currentPath, data.content, {
            currentUser,
            primaryGroup,
        });
    } else if (data.type === Config.FILESYSTEM.DEFAULT_DIRECTORY_TYPE) {
        const dirResult = await FileSystemManager.createOrUpdateFile(
            currentPath,
            null,
            { isDirectory: true, currentUser, primaryGroup }
        );
        if (dirResult.success && data.children) {
            for (const childName in data.children) {
                await _restoreNode(
                    childName,
                    data.children[childName],
                    currentPath,
                    dependencies,
                    currentUser
                );
            }
        }
    }
}

window.UnzipCommand = class UnzipCommand extends Command {
    constructor() {
        super({
            commandName: "unzip",
            description: "Extracts files from a .zip archive.",
            helpText: `Usage: unzip <archive.zip>
      Extract files from a OopisOS zip archive.
      DESCRIPTION
      The unzip command extracts the contents of a .zip file created with
      the 'zip' command. It recreates the archived directory structure
      in the current working directory.
      If files or directories from the archive already exist in the
      current location, they will be overwritten.
      EXAMPLES
      unzip my_project.zip
      Extracts the contents of 'my_project.zip' into the current
      directory.`,
            completionType: "paths",
            validations: {
                args: {
                    exact: 1,
                    error: "Usage: unzip <archive.zip>"
                },
                paths: [{
                    argIndex: 0,
                    options: {
                        expectedType: 'file',
                        permissions: ['read']
                    }
                }]
            },
        });
    }

    async coreLogic(context) {
        const { currentUser, validatedPaths, dependencies } = context;
        const { ErrorHandler, FileSystemManager } = dependencies;

        if (!validatedPaths || validatedPaths.length === 0) {
            return ErrorHandler.createError("unzip: missing file operand");
        }

        const { node: archiveNode } = validatedPaths[0];

        if (!archiveNode || !archiveNode.name.endsWith(".zip")) {
            return ErrorHandler.createError(
                "unzip: provided file is not a .zip archive."
            );
        }

        let archiveData;
        try {
            archiveData = JSON.parse(archiveNode.content || "{}");
        } catch (e) {
            return ErrorHandler.createError(
                `unzip: cannot process archive, invalid JSON format. ${e.message}`
            );
        }

        const currentDirectory = FileSystemManager.getCurrentPath();

        try {
            for (const name in archiveData) {
                await _restoreNode(
                    name,
                    archiveData[name],
                    currentDirectory,
                    dependencies,
                    currentUser
                );
            }
            await FileSystemManager.save();
            return ErrorHandler.createSuccess(
                `Archive '${archiveNode.name}' successfully unzipped.`
            );
        } catch (e) {
            return ErrorHandler.createError(
                `unzip: an error occurred during extraction: ${e.message}`
            );
        }
    }
}