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
      -n, --max-args=MAX_ARGS
            Use at most MAX_ARGS arguments per command line.
      EXAMPLES
      ls | xargs rm
      Deletes all files and directories listed by 'ls'.
      ls *.tmp | xargs -I {} mv {} {}.bak
      Renames all .tmp files to .tmp.bak.`,
      isInputStream: true,
      flagDefinitions: [
        { name: "replace", short: "-I", takesValue: true },
        { name: "maxArgs", short: "-n", long: "--max-args", takesValue: true },
      ],
    });
  }

  async coreLogic(context) {
    const { args, flags, options, inputItems, inputError, dependencies } = context;
    const { CommandExecutor, ErrorHandler, Utils } = dependencies;

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

    if (flags.replace) {
      // Logic for -I flag remains the same, as it processes one item at a time.
      const placeholder = flags.replace;
      for (const item of itemsFromInput) {
        const commandWithReplacement = baseCommandParts
            .map(part => {
              const newPart = part.replace(new RegExp(placeholder, 'g'), item);
              if (/\s/.test(newPart) && !(newPart.startsWith('"') && newPart.endsWith('"'))) {
                return `"${newPart}"`;
              }
              return newPart;
            })
            .join(" ");

        const result = await CommandExecutor.processSingleCommand(commandWithReplacement, options);
        if (!result.success) {
          return ErrorHandler.createError(result.error);
        }
      }
    } else {
      const maxArgs = flags.maxArgs ? parseInt(flags.maxArgs, 10) : 128; // Default batch size
      const baseCommand = baseCommandParts.join(" ");

      for (let i = 0; i < itemsFromInput.length; i += maxArgs) {
        const batch = itemsFromInput.slice(i, i + maxArgs);
        const fullCommand = `${baseCommand} ${batch.map(item => `"${item}"`).join(" ")}`;
        const result = await CommandExecutor.processSingleCommand(fullCommand, options);
        if (!result.success) {
          // Stop on the first error, just like the original logic
          return ErrorHandler.createError(result.error);
        }
      }
    }

    return ErrorHandler.createSuccess("");
  }
};