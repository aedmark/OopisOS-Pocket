// scripts/commands/nl.js
window.NlCommand = class NlCommand extends Command {
    constructor() {
        super({
            commandName: "nl",
            description: "Numbers lines of files.",
            helpText: `Usage: nl [FILE]...
      Write each FILE to standard output, with line numbers added.
      With no FILE, or when FILE is -, read standard input.`,
            isInputStream: true,
            completionType: "paths"
        });
    }

    async coreLogic(context) {
        const { inputItems, inputError, dependencies } = context;
        const { ErrorHandler } = dependencies;

        if (inputError) {
            return ErrorHandler.createError("nl: No readable input provided or permission denied.");
        }
        if (!inputItems || inputItems.length === 0) {
            return ErrorHandler.createSuccess("");
        }

        const content = inputItems.map((item) => item.content).join("\n");
        const lines = content.split('\n');
        let lineNumber = 1;
        const outputLines = lines.map(line => {
            if (line.trim() !== '') {
                return `     ${String(lineNumber++).padStart(5)}  ${line}`;
            }
            return `      ${line}`;
        });

        return ErrorHandler.createSuccess(outputLines.join('\n'));
    }
};