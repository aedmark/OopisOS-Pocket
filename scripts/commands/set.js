// scripts/commands/set.js
(() => {
  "use strict";

  const setCommandDefinition = {
    commandName: "set",
    description: "Set or display environment variables.",
    helpText: `Usage: set [variable[=value]] ...

Set or display environment variables.

DESCRIPTION
       The set command is used to define session-specific environment
       variables. These variables are expanded by the shell when prefixed
       with a '$' (e.g., $VAR).

       Running \`set\` with no arguments will display a list of all
       currently defined environment variables and their values.

       To set a variable, provide a name and a value. If the value is
       omitted, the variable is set to an empty string. Variable names
       cannot contain spaces.`,
    coreLogic: async (context) => {
      const { args, dependencies } = context;
      const { EnvironmentManager, ErrorHandler } = dependencies;


      try {
        if (args.length === 0) {
          const allVars = EnvironmentManager.getAll();
          const output = Object.keys(allVars)
              .sort()
              .map((key) => `${key}="${allVars[key]}"`)
              .join("\n");
          return ErrorHandler.createSuccess(output);
        }

        const { name, value } = Utils.parseKeyValue(args);

        if (value !== null) {
          const result = EnvironmentManager.set(name, value);
          if (!result.success) {
            return ErrorHandler.createError(`set: ${result.error}`);
          }
        } else {
          const result = EnvironmentManager.set(name, "");
          if (!result.success) {
            return ErrorHandler.createError(`set: ${result.error}`);
          }
        }

        return ErrorHandler.createSuccess();
      } catch (e) {
        return ErrorHandler.createError(
            `set: An unexpected error occurred: ${e.message}`
        );
      }
    },
  };
  CommandRegistry.register(setCommandDefinition);
})();