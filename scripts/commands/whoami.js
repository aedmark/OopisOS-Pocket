// scripts/commands/whoami.js
(() => {
  "use strict";

  const whoamiCommandDefinition = {
    commandName: "whoami",
    description: "Prints the current effective user name.",
    helpText: `Usage: whoami

Print the current user name.

DESCRIPTION
       The whoami command prints the user name associated with the
       current effective user ID.`,
    argValidation: {
      exact: 0,
    },
    coreLogic: async (context) => {
      const { dependencies } = context;
      const { ErrorHandler, UserManager } = dependencies;
      return ErrorHandler.createSuccess(UserManager.getCurrentUser().name);
    },
  };
  CommandRegistry.register(whoamiCommandDefinition);
})();