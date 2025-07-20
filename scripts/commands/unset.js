// scripts/commands/unset.js
(() => {
  "use strict";

  const unsetCommandDefinition = {
    commandName: "unset",
    description: "Unsets one or more environment variables.",
    helpText: `Usage: unset <variable_name>...

Unset environment variable values.

DESCRIPTION
       The unset command removes the specified environment variables from
       the current session. After a variable is unset, it will no longer
       be available for expansion by the shell (e.g., using $VAR).

EXAMPLES
       set GREETING="Hello"
       echo $GREETING
              Hello

       unset GREETING
       echo $GREETING
              (prints a blank line)`,
    argValidation: { min: 1, error: "Usage: unset <variable_name>..." },
    coreLogic: async (context) => {
      const { args, dependencies } = context;
      const { EnvironmentManager, ErrorHandler } = dependencies;
      try {
        args.forEach((varName) => EnvironmentManager.unset(varName));
        return ErrorHandler.createSuccess();
      } catch (e) {
        return ErrorHandler.createError(
            `unset: An unexpected error occurred: ${e.message}`
        );
      }
    },
  };
  CommandRegistry.register(unsetCommandDefinition);
})();