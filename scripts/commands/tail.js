// scripts/commands/tail.js
(() => {
  "use strict";

  const tailCommandDefinition = {
    commandName: "tail",
    description: "Outputs the last part of files.",
    helpText: `Usage: tail [OPTION]... [FILE]...

Print the last 10 lines of each FILE to standard output.
With more than one FILE, precede each with a header giving the file name.

DESCRIPTION
       The tail command displays the end of a text file. It is useful
       for quickly checking the most recent entries in log files.

OPTIONS
       -n, --lines=COUNT
              Print the last COUNT lines instead of the last 10.
       -c, --bytes=COUNT
              Print the last COUNT bytes of each file.

EXAMPLES
       tail /var/log/sudo.log
              Displays the last 10 lines of the sudo log file.

       tail -n 5 README.md
              Displays the last 5 lines of the README.md file.

       ls | tail -n 3
              Displays the last 3 files or directories in the current location.`,
    isInputStream: true,
    completionType: "paths",
    flagDefinitions: [
      { name: "lines", short: "-n", long: "--lines", takesValue: true },
      { name: "bytes", short: "-c", long: "--bytes", takesValue: true },
    ],
    coreLogic: async (context) => {
      const { flags, inputItems, inputError, dependencies } = context;
      const { ErrorHandler, Utils } = dependencies;

      try {
        if (inputError) {
          return ErrorHandler.createError(
              "tail: No readable input provided or permission denied."
          );
        }

        if (!inputItems || inputItems.length === 0) {
          return ErrorHandler.createSuccess("");
        }

        if (flags.lines && flags.bytes) {
          return ErrorHandler.createError("tail: cannot use both -n and -c");
        }

        const input = inputItems.map((item) => item.content).join("\n");

        let lineCount = 10;
        if (flags.lines) {
          const linesResult = Utils.parseNumericArg(flags.lines, {
            allowFloat: false,
            allowNegative: false,
          });
          if (linesResult.error) {
            return ErrorHandler.createError(
                `tail: invalid number of lines: '${flags.lines}'`
            );
          }
          lineCount = linesResult.value;
        }

        let byteCount = null;
        if (flags.bytes) {
          const bytesResult = Utils.parseNumericArg(flags.bytes, {
            allowFloat: false,
            allowNegative: false,
          });
          if (bytesResult.error) {
            return ErrorHandler.createError(
                `tail: invalid number of bytes: '${flags.bytes}'`
            );
          }
          byteCount = bytesResult.value;
        }

        let output;
        if (byteCount !== null) {
          output = input.substring(input.length - byteCount);
        } else {
          const lines = input.split("\n");
          const relevantLines =
              lines.at(-1) === "" ? lines.slice(0, -1) : lines;
          output = relevantLines.slice(-lineCount).join("\n");
        }

        return ErrorHandler.createSuccess(output);
      } catch (e) {
        return ErrorHandler.createError(
            `tail: An unexpected error occurred: ${e.message}`
        );
      }
    },
  };
  CommandRegistry.register(tailCommandDefinition);
})();