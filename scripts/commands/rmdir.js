// scripts/commands/rmdir.js
(() => {
  "use strict";

  const rmdirCommandDefinition = {
    commandName: "rmdir",
    description: "Removes empty directories.",
    helpText: `Usage: rmdir [DIRECTORY]...

Remove the DIRECTORY(ies), if they are empty.

DESCRIPTION
       const rmdir command removes empty directories from the filesystem.
       This command provides a safe way to clean up directory structures,
       as it will fail rather than delete a directory that still contains
       files or other subdirectories.

EXAMPLES
       rmdir old_project/
              Removes the 'old_project' directory, but only if it is empty.

SEE ALSO
       rm(1)`,
    completionType: "paths",
    validations: {
      args: { min: 1, error: "missing operand" },
      paths: [
        {
          argIndex: 'all',
          options: { expectedType: 'directory' },
          permissionsOnParent: ['write']
        }
      ]
    },
    coreLogic: async (context) => {
      const { validatedPaths, dependencies } = context;
      const { ErrorHandler, FileSystemManager } = dependencies;

      for (const pathData of validatedPaths) {
        const { arg: pathArg, node, resolvedPath } = pathData;

        if (Object.keys(node.children).length > 0) {
          return ErrorHandler.createError(
              `rmdir: failed to remove '${pathArg}': Directory not empty`
          );
        }

        const parentPath =
            resolvedPath.substring(0, resolvedPath.lastIndexOf("/")) || "/";
        const parentNode = FileSystemManager.getNodeByPath(parentPath);

        const dirName = resolvedPath.split("/").pop();
        delete parentNode.children[dirName];
        parentNode.mtime = new Date().toISOString();
      }

      return ErrorHandler.createSuccess("", { stateModified: true });
    },
  };
  CommandRegistry.register(rmdirCommandDefinition);
})();