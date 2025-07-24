// gem/scripts/commands/patch.js
window.PatchCommand = class PatchCommand extends Command {
    constructor() {
        super({
            commandName: "patch",
            description: "Applies a diff file to a target file.",
            helpText: `Usage: patch <target_file> <patch_file>
      Applies a patch to a file.
      DESCRIPTION
      The patch command takes a patch file (usually created with the
      'diff' command) and applies the changes to a target file.
      It's a powerful tool for applying updates to text-based files
      without having to replace the entire file.
      WARNING
      This command directly modifies the target file. It is recommended
      to have a backup of the target file before applying a patch.`,
            completionType: "paths",
            validations: {
                args: {
                    exact: 2,
                    error: "Usage: patch <target_file> <patch_file>"
                },
                paths: [{
                    argIndex: 0,
                    options: {
                        expectedType: 'file',
                        permissions: ['read', 'write']
                    }
                }, {
                    argIndex: 1,
                    options: {
                        expectedType: 'file',
                        permissions: ['read']
                    }
                }]
            },
        });
    }

    _parsePatch(patchContent) {
        // This is a placeholder for a real diff parser.
        // For now, this assumes the patch file is a JSON object created by PatchUtils.createPatch.
        // A more advanced version would parse a standard text-based diff format.
        return JSON.parse(patchContent);
    }

    async coreLogic(context) {
        const { args, validatedPaths, currentUser, dependencies } = context;
        const { FileSystemManager, UserManager, ErrorHandler, PatchUtils } = dependencies;

        if (!PatchUtils || !PatchUtils.applyPatch) {
            return ErrorHandler.createError("patch: Patch utility is not available.");
        }

        const targetFileNode = validatedPaths[0].node;
        const targetFilePath = validatedPaths[0].resolvedPath;
        const patchFileNode = validatedPaths[1].node;

        const targetContent = targetFileNode.content || "";
        const patchContent = patchFileNode.content || "";

        try {
            const patchObject = this._parsePatch(patchContent);
            const patchedContent = PatchUtils.applyPatch(targetContent, patchObject);

            const primaryGroup = UserManager.getPrimaryGroupForUser(currentUser);
            const saveResult = await FileSystemManager.createOrUpdateFile(
                targetFilePath,
                patchedContent,
                { currentUser, primaryGroup }
            );

            if (!saveResult.success) {
                return ErrorHandler.createError(`patch: ${saveResult.error}`);
            }

            return ErrorHandler.createSuccess(`Successfully patched '${args[0]}'.`, { stateModified: true });
        } catch (e) {
            return ErrorHandler.createError(`patch: Failed to apply patch. Error: ${e.message}`);
        }
    }
};