// scripts/commands/xargs.js
window.XargsCommand = class XargsCommand extends Command {
  constructor() {
    super({
      commandName: "xargs",
      description: "Builds and executes command lines from standard input.",
      helpText: `Usage: xargs [OPTION]... [command]
      Build and execute command lines from standard input.
      DESCRIPTION
      xargs reads items from the standard input, delimited by spaces or
      newlines, and executes the specified [command] using these items
      as arguments.
      OPTIONS
      -I <replace_str>
             Replace occurrences of replace_str in the initial-arguments with
             names read from standard input.
      EXAMPLES
      ls | xargs rm
      Deletes all files and directories listed by 'ls'.
      ls *.tmp | xargs -I {} mv {} {}.bak
      Renames all .tmp files to .tmp.bak.`,
      isInputStream: true,
      flagDefinitions: [
        { name: "replace", short: "-I", takesValue: true },
      ],
    });
  }

  async coreLogic(context) {
    const { args, flags, options, inputItems, inputError, dependencies } = context;
    const { CommandExecutor, ErrorHandler } = dependencies;

    if (inputError) {
      return ErrorHandler.createError("xargs: No readable input provided.");
    }

    if (!inputItems || inputItems.length === 0) {
      return ErrorHandler.createSuccess("");
    }

    const baseCommandParts = args;
    const itemsFromInput = inputItems
        .map((item) => item.content)
        .join("\n")
        .split(/\n/)
        .filter(Boolean);

    if (itemsFromInput.length === 0) {
      return ErrorHandler.createSuccess("");
    }

    // If the -I flag is used
    if (flags.replace) {
      const placeholder = flags.replace;
      for (const item of itemsFromInput) {
        const commandWithReplacement = baseCommandParts
            .map(part => {
              const newPart = part.replace(new RegExp(placeholder, 'g'), item);
              // Quote if it contains spaces and isn't already quoted
              if (/\s/.test(newPart) && !(newPart.startsWith('"') && newPart.endsWith('"'))) {
                return `"${newPart}"`;
              }
              return newPart;
            })
            .join(" ");

        const result = await CommandExecutor.processSingleCommand(commandWithReplacement, options);
        if (!result.success) {
          // Stop on first error
          return ErrorHandler.createError(result.error);
        }
      }
      return ErrorHandler.createSuccess(""); // Success if all commands ran
    }

    // Original behavior if -I is not used
    const baseCommand = baseCommandParts.join(" ");
    const fullCommand = `${baseCommand} ${itemsFromInput.map(item => `"${item}"`).join(" ")}`;
    const result = await CommandExecutor.processSingleCommand(fullCommand, options);

    if (result.success) {
      return ErrorHandler.createSuccess(result.output);
    } else {
      return ErrorHandler.createError(result.error);
    }
  }
};