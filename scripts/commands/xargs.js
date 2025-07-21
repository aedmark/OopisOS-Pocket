// scripts/commands/xargs.js
(() => {
  "use strict";

  const xargsCommandDefinition = {
    commandName: "xargs",
    description: "Builds and executes command lines from standard input.",
    helpText: `Usage: xargs [OPTION]... [command]

Read items from standard input and execute a command for each item.

DESCRIPTION
       The xargs command reads newline-delimited items from standard
       input and executes the specified [command] for each item.

       By default, all items are appended as arguments to a single
       command invocation. If no command is specified, 'echo' is used.

OPTIONS
       -I <replace-str>
              Replace occurrences of <replace-str> in the initial arguments
              with names read from standard input. This mode executes the
              command once per input line.

EXAMPLES
       ls *.log | xargs rm
              Deletes all files ending in .log in the current directory.

       find . -name "*.tmp" | xargs rm
              Finds and deletes all files ending in .tmp in the
              current directory and its subdirectories.
              
       ls *.txt | xargs -I {} mv {} {}.bak
              Renames all .txt files to .txt.bak.`,
    isInputStream: true,
    flagDefinitions: [
      {
        name: "replaceStr",
        short: "-I",
        takesValue: true,
      },
    ],
    coreLogic: async (context) => {
      const { args, flags, inputItems, inputError, dependencies } = context;
      const { ErrorHandler, CommandExecutor } = dependencies;

      try {
        if (inputError) {
          return ErrorHandler.createError(
              "xargs: No readable input provided or permission denied."
          );
        }

        if (!inputItems || inputItems.length === 0) {
          return ErrorHandler.createSuccess("");
        }

        const inputText = inputItems.map((item) => item.content).join("\n");
        if (inputText.trim() === "") {
          return ErrorHandler.createSuccess("");
        }

        const lines = inputText.trim().split("\n").filter(Boolean);
        const baseCommandArgs = args.length > 0 ? args : ["echo"];
        let lastResult = { success: true, output: "" };
        let combinedOutput = [];
        const replaceStr = flags.replaceStr;
        let stateModified = false;

        if (replaceStr) {
          // -I mode: execute command for each line
          for (const line of lines) {
            const rawLine = line.trim();
            if (rawLine === "") continue;

            const commandParts = baseCommandArgs.map((part) => {
              if (part.includes(replaceStr)) {
                const newPart = part.replace(new RegExp(replaceStr, "g"), rawLine);
                return `"${newPart.replace(/"/g, '\\"')}"`;
              }
              return part;
            });

            const commandToExecute = commandParts.join(" ");

            lastResult = await CommandExecutor.processSingleCommand(
                commandToExecute,
                { isInteractive: false, }
            );

            if (lastResult.stateModified) {
              stateModified = true;
            }

            if (lastResult.output) {
              combinedOutput.push(lastResult.output);
            }

            if (!lastResult.success) {
              const errorMsg = `xargs: ${commandToExecute}: ${lastResult.error || "Command failed"}`;
              return ErrorHandler.createError(errorMsg);
            }
          }
        } else {
          // Default mode: append all lines as arguments
          const quotedLines = lines.map(line => `"${line.replace(/"/g, '\\"')}"`);
          const commandToExecute = [...baseCommandArgs, ...quotedLines].join(" ");
          lastResult = await CommandExecutor.processSingleCommand(
              commandToExecute,
              { isInteractive: false, }
          );

          if (lastResult.stateModified) {
            stateModified = true;
          }

          if (lastResult.output) {
            combinedOutput.push(lastResult.output);
          }
          if (!lastResult.success) {
            const errorMsg = `xargs: ${commandToExecute}: ${lastResult.error || "Command failed"}`;
            return ErrorHandler.createError(errorMsg);
          }
        }

        return ErrorHandler.createSuccess(combinedOutput.join("\n"), { stateModified });
      } catch (e) {
        return ErrorHandler.createError(
            `xargs: An unexpected error occurred: ${e.message}`
        );
      }
    },
  };
  CommandRegistry.register(xargsCommandDefinition);
})();