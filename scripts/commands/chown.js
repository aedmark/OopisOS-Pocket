// scripts/commands/chown.js
(() => {
  "use strict";

  const chownCommandDefinition = {
    commandName: "chown",
    description: "Changes the user ownership of a file or directory.",
    helpText: `Usage: chown <owner> <path>

Change the user ownership of a file or directory.

DESCRIPTION
       The chown command changes the user ownership of the file or
       directory specified by <path> to <owner>. The <owner> must be a
       valid, existing user on the system.

       Use the 'ls -l' command to view the current owner of a file.

EXAMPLES
       chown Guest /home/root/somefile
              Changes the owner of 'somefile' from 'root' to 'Guest'.

PERMISSIONS
       Only the superuser (root) can change the ownership of a file.`,
    completionType: "users",
    validations: {
      args: { exact: 2, error: "Usage: chown <new_owner> <path>" },
      paths: [
        {
          argIndex: 1,
          options: {
            ownershipRequired: true
          }
        }
      ]
    },
    coreLogic: async (context) => {
      const { args, validatedPaths, dependencies } = context;
      const { UserManager, Config, ErrorHandler } = dependencies;
      const newOwnerArg = args[0];
      const { node } = validatedPaths[0];
      const nowISO = new Date().toISOString();

      try {
        if (
            !(await UserManager.userExists(newOwnerArg)) &&
            newOwnerArg !== Config.USER.DEFAULT_NAME
        ) {
          return ErrorHandler.createError(
              `chown: user '${newOwnerArg}' does not exist.`
          );
        }

        node.owner = newOwnerArg;
        node.mtime = nowISO;

        return ErrorHandler.createSuccess("", { stateModified: true });
      } catch (e) {
        return ErrorHandler.createError(
            `chown: An unexpected error occurred: ${e.message}`
        );
      }
    },
  };
  CommandRegistry.register(chownCommandDefinition);
})();