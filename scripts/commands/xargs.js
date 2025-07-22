// scripts/commands/xargs.js
class XargsCommand extends Command {
  constructor() {
    super({
      commandName: "xargs",
      description: "Builds and executes command lines from standard input.",
      helpText: `Usage: xargs [command]
      Build and execute command lines from standard input.
      DESCRIPTION
      xargs reads items from the standard input, delimited by spaces or
      newlines, and executes the specified [command] using these items
      as arguments.
      If no command is given, xargs defaults to 'echo'.
      EXAMPLES
      ls | xargs rm
      Deletes all files and directories listed by 'ls'.
      echo "file1.txt file2.txt" | xargs touch
      Creates 'file1.txt' and 'file2.txt'.`,
      isInputStream: true,
    });
  }

  async coreLogic(context) {
    const { args, options, inputItems, inputError, dependencies } = context;
    const { CommandExecutor, ErrorHandler } = dependencies;

    if (inputError) {
      return ErrorHandler.createError(
          "xargs: No readable input provided."
      );
    }

    if (!inputItems || inputItems.length === 0) {
      return ErrorHandler.createSuccess("");
    }

    const baseCommand = args.length > 0 ? args.join(" ") : "echo";
    const itemsFromInput = inputItems
        .map((item) => item.content)
        .join(" ")
        .split(/\s+/)
        .filter(Boolean);

    if (itemsFromInput.length === 0) {
      return ErrorHandler.createSuccess("");
    }

    const fullCommand = `${baseCommand} ${itemsFromInput.join(" ")}`;
    const result = await CommandExecutor.processSingleCommand(
        fullCommand,
        options
    );

    if (result.success) {
      return ErrorHandler.createSuccess(result.output);
    } else {
      return ErrorHandler.createError(result.error);
    }
  }
}