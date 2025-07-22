// scripts/commands/xor.js
class XorCommand extends Command {
    constructor() {
        super({
            commandName: "xor",
            description: "Applies a simple XOR cipher to a file.",
            helpText: `Usage: xor -k <key> -i <inputfile> -o <outputfile>
      Apply a simple XOR cipher to a file.
      DESCRIPTION
      xor is a simple symmetric encryption utility that uses a repeating
      key XOR cipher. It is intended for educational/demonstration
      purposes and is NOT cryptographically secure.
      The same command and key are used for both encryption and decryption.
      OPTIONS
      -k, --key=<key>
      The secret key (string) for the operation.
      -i, --input=<inputfile>
      The file to read data from.
      -o, --output=<outputfile>
      The file to write the resulting data to.
      All options are required.`,
            flagDefinitions: [
                { name: "key", short: "-k", long: "--key", takesValue: true },
                { name: "input", short: "-i", long: "--input", takesValue: true },
                { name: "output", short: "-o", long: "--output", takesValue: true },
            ],
        });
    }

    async coreLogic(context) {
        const { flags, currentUser, dependencies } = context;
        const { FileSystemManager, UserManager, ErrorHandler } = dependencies;

        if (!flags.key || !flags.input || !flags.output) {
            return ErrorHandler.createError("xor: all options are required");
        }

        const inputValidation = FileSystemManager.validatePath(flags.input, {
            expectedType: "file",
            permissions: ["read"],
        });
        if (!inputValidation.success) {
            return ErrorHandler.createError(
                `xor: input file: ${inputValidation.error}`
            );
        }
        const inputFileNode = inputValidation.data.node;

        const outputValidation = FileSystemManager.validatePath(flags.output, {
            allowMissing: true,
            expectedType: "file",
        });
        if (
            !outputValidation.success &&
            outputValidation.data?.node !== null
        ) {
            return ErrorHandler.createError(
                `xor: output file: ${outputValidation.error}`
            );
        }
        const outputPath = outputValidation.data.resolvedPath;

        const key = flags.key;
        const inputContent = inputFileNode.content || "";
        let outputContent = "";

        for (let i = 0; i < inputContent.length; i++) {
            const charCode = inputContent.charCodeAt(i);
            const keyCode = key.charCodeAt(i % key.length);
            outputContent += String.fromCharCode(charCode ^ keyCode);
        }

        const primaryGroup = UserManager.getPrimaryGroupForUser(currentUser);
        const saveResult = await FileSystemManager.createOrUpdateFile(
            outputPath,
            outputContent,
            { currentUser, primaryGroup }
        );

        if (!saveResult.success) {
            return ErrorHandler.createError(`xor: ${saveResult.error}`);
        }

        return ErrorHandler.createSuccess("", { stateModified: true });
    }
}