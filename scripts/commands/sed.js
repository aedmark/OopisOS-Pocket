// scripts/commands/sed.js
window.SedCommand = class SedCommand extends Command {
    constructor() {
        super({
            commandName: "sed",
            description: "Stream editor for filtering and transforming text.",
            helpText: `Usage: sed <script> [file...]
      A stream editor for text transformation.
      DESCRIPTION
      This version supports the basic substitution command: s/regexp/replacement/flags.
      The 'g' flag for global replacement is supported.`,
            isInputStream: true,
            completionType: "paths"
        });
    }

    async coreLogic(context) {
        const { args, inputItems, inputError, dependencies } = context;
        const { ErrorHandler } = dependencies;

        if (inputError) {
            return ErrorHandler.createError("sed: No readable input or permission denied.");
        }
        if (args.length === 0) {
            return ErrorHandler.createError("sed: no script specified.");
        }

        const script = args[0];
        const substitutionRegex = /^s\/(.+?)\/(.*?)\/([g]?)$/;
        const match = script.match(substitutionRegex);

        if (!match) {
            return ErrorHandler.createError(`sed: invalid script: ${script}`);
        }

        const [, pattern, replacement, flags] = match;
        const regex = new RegExp(pattern, flags);

        const content = (inputItems || []).map(item => item.content).join('\n');
        const lines = content.split('\n');
        const transformedLines = lines.map(line => line.replace(regex, replacement));

        return ErrorHandler.createSuccess(transformedLines.join('\n'));
    }
};