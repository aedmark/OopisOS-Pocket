// scripts/commands/pwd.js
(() => {
  "use strict";

  const pwdCommandDefinition = {
    commandName: "pwd",
    description: "Prints the current working directory.",
    helpText: `Usage: pwd

Print the full path of the current working directory.

DESCRIPTION
       The pwd (print working directory) command writes the full, absolute
       pathname of the current working directory to the standard output.`,
    validations: {
      args: {
        exact: 0
      }
    },
    coreLogic: async (context) => {
      const { dependencies } = context;
      const { ErrorHandler, FileSystemManager } = dependencies;
      try {
        return ErrorHandler.createSuccess(FileSystemManager.getCurrentPath());
      } catch (e) {
        return ErrorHandler.createError(
            `pwd: An unexpected error occurred: ${e.message}`
        );
      }
    },
  };
  CommandRegistry.register(pwdCommandDefinition);
})();