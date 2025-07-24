// scripts/commands/cut.js
window.CutCommand = class CutCommand extends Command {
    constructor() {
        super({
            commandName: "cut",
            description: "Extract sections from each line of files.",
            helpText: `Usage: cut [OPTION]... [FILE]...
      Print selected parts of lines from each FILE to standard output.

      DESCRIPTION
      The cut utility extracts sections from each line of its input.
      Selection can be by bytes, characters, or fields, but this version
      primarily supports field-based cutting.

      OPTIONS
      -d, --delimiter=DELIM
            Use DELIM instead of TAB for field delimiter.
      -f, --fields=LIST
            Select only these fields. LIST is a comma-separated list of
            positive integers (e.g., 1,3,4).

      EXAMPLES
      ls -l | cut -d' ' -f9
            (Note: Due to variable spaces, use awk for more reliable column extraction from ls)

      cat data.csv | cut -d',' -f1,3
            Extracts the 1st and 3rd fields from a CSV file.`,
            isInputStream: true,
            completionType: "paths",
            flagDefinitions: [
                { name: "delimiter", short: "-d", long: "--delimiter", takesValue: true },
                { name: "fields", short: "-f", long: "--fields", takesValue: true },
            ],
        });
    }

    async coreLogic(context) {
        const { flags, inputItems, inputError, dependencies } = context;
        const { ErrorHandler } = dependencies;

        if (inputError) {
            return ErrorHandler.createError("cut: No readable input provided or permission denied.");
        }

        if (!flags.fields) {
            return ErrorHandler.createError("cut: you must specify a list of fields with -f");
        }

        const delimiter = flags.delimiter || '\t';
        const fieldList = flags.fields.split(',').map(f => parseInt(f, 10)).filter(f => !isNaN(f) && f > 0).sort((a, b) => a - b);

        if (fieldList.length === 0) {
            return ErrorHandler.createError("cut: invalid field list");
        }

        if (!inputItems || inputItems.length === 0) {
            return ErrorHandler.createSuccess("");
        }

        const content = inputItems.map((item) => item.content).join("\n");
        const lines = content.split('\n');
        const outputLines = [];

        for (const line of lines) {
            if (line === "" && lines.indexOf(line) === lines.length -1) continue;
            const fields = line.split(delimiter);
            const selectedFields = fieldList.map(index => fields[index - 1]).filter(f => f !== undefined);
            outputLines.push(selectedFields.join(delimiter));
        }

        return ErrorHandler.createSuccess(outputLines.join('\n'));
    }
}