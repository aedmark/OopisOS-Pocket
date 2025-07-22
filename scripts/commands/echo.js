// scripts/commands/echo.js
window.EchoCommand = class EchoCommand extends Command {
    constructor() {
        super({
            commandName: "echo",
            description: "Writes arguments to the standard output.",
            helpText: `Usage: echo [-e] [STRING]...
      Write arguments to the standard output.
      DESCRIPTION
      The echo utility writes its arguments separated by spaces,
      terminated by a newline, to the standard output.
      OPTIONS
      -e     Enable interpretation of backslash escapes.
      ESCAPES
      If -e is in effect, the following sequences are recognized:
      \\\\     backslash
      \\n     new line
      \\t     horizontal tab
      \\c     produce no further output (the trailing newline is suppressed)
      EXAMPLES
      echo Hello, world!
      Displays "Hello, world!".
      echo -e "A line.\\n_A second line."
      Displays two lines of text.
      echo "User: $USER"
      Displays the name of the current user by expanding the
      $USER environment variable.`,
            flagDefinitions: [{ name: "enableBackslashEscapes", short: "-e" }],
        });
    }

    async coreLogic(context) {
        const { ErrorHandler } = context.dependencies;
        let output = context.args.join(" ");
        let suppressNewline = false;

        if (context.flags.enableBackslashEscapes) {
            const cIndex = output.indexOf("\\c");
            if (cIndex !== -1) {
                output = output.substring(0, cIndex);
                suppressNewline = true;
            }

            output = output
                .replace(/\\n/g, "\n")
                .replace(/\\t/g, "\t")
                .replace(/\\\\/g, "\\");
        }

        // The final newline is now handled by the executor, so we just return the processed string.
        return ErrorHandler.createSuccess(output, { suppressNewline });
    }
}