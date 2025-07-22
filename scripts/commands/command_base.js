// scripts/commands/command_base.js
class Command {
    constructor(definition) {
        if (!definition || !definition.commandName) {
            throw new Error("Command definition must include a commandName.");
        }
        this.definition = definition;
        this.commandName = definition.commandName;
    }

    async *_generateInputContent(context, firstFileArgIndex = 0) {
        const { args, options, currentUser } = context;
        const { FileSystemManager } = context.dependencies;

        if (options.stdinContent !== null && options.stdinContent !== undefined) {
            yield {
                success: true,
                content: options.stdinContent,
                sourceName: "stdin",
            };
            return;
        }

        // This is the key change: We now respect the 'firstFileArgIndex'
        // passed from the execute method to know where the file list truly begins.
        const fileArgs = args.slice(firstFileArgIndex);

        if (fileArgs.length === 0) {
            return;
        }

        for (const pathArg of fileArgs) {
            const pathValidationResult = FileSystemManager.validatePath(pathArg, {
                expectedType: "file",
            });
            if (!pathValidationResult.success) {
                yield {
                    success: false,
                    error: pathValidationResult.error,
                    sourceName: pathArg,
                };
                continue;
            }
            const { node } = pathValidationResult.data;

            if (!FileSystemManager.hasPermission(node, currentUser, "read")) {
                yield {
                    success: false,
                    error: `Permission denied: ${pathArg}`,
                    sourceName: pathArg,
                };
                continue;
            }

            yield { success: true, content: node.content || "", sourceName: pathArg };
        }
    }

    /**
     * The main execution method called by the CommandExecutor.
     * It orchestrates parsing, validation, and execution.
     */
    async execute(rawArgs, options, dependencies) {
        const { Utils, ErrorHandler, FileSystemManager, UserManager } = dependencies;

        // 1. Parse Flags
        const { flags, remainingArgs } = Utils.parseFlags(
            rawArgs,
            this.definition.flagDefinitions || []
        );

        // 2. Validate Argument Count
        if (this.definition.argValidation) { // Simplified check
            const argValidation = Utils.validateArguments(
                remainingArgs,
                this.definition.argValidation
            );
            if (!argValidation.isValid) {
                const errorMsg = this.definition.argValidation.error || argValidation.errorDetail;
                return ErrorHandler.createError(`${this.commandName}: ${errorMsg}`);
            }
        }

        // 3. Validate Paths and Permissions
        const validatedPaths = [];
        if (this.definition.validations && this.definition.validations.paths) {
            for (const rule of this.definition.validations.paths) {
                const pathValidationResult = await this._validatePathRule(rule, remainingArgs, dependencies);
                if (!pathValidationResult.success) {
                    return ErrorHandler.createError(`${this.commandName}: ${pathValidationResult.error}`);
                }
                validatedPaths.push(...pathValidationResult.data);
            }
        }

        // 4. Prepare and Execute Core Logic
        const context = {
            args: remainingArgs,
            options,
            flags,
            currentUser: UserManager.getCurrentUser().name,
            validatedPaths,
            dependencies,
        };

        if (this.definition.isInputStream) {
            const inputParts = [];
            let hadError = false;
            let fileCount = 0;
            let firstSourceName = null;

            // Determine the correct starting index for file arguments.
            // For awk, the program is the first arg, so files start at index 1.
            const fileStartIndex = this.definition.firstFileArgIndex !== undefined
                ? this.definition.firstFileArgIndex
                // This is the fallback that correctly identifies the start of file paths for awk.
                : (this.definition.argValidation && (this.definition.argValidation.exact || this.definition.argValidation.min))
                    ? (this.definition.argValidation.exact || this.definition.argValidation.min)
                    : 1;


            for await (const item of this._generateInputContent(
                context,
                fileStartIndex
            )) {
                fileCount++;
                if (firstSourceName === null) firstSourceName = item.sourceName;

                if (!item.success) {
                    await dependencies.OutputManager.appendToOutput(item.error, {
                        typeClass: dependencies.Config.CSS_CLASSES.ERROR_MSG,
                    });
                    hadError = true;
                } else {
                    inputParts.push({
                        content: item.content,
                        sourceName: item.sourceName,
                    });
                }
            }

            context.inputItems = inputParts;
            context.inputError = hadError;
            context.inputFileCount = fileCount;
            context.firstSourceName = firstSourceName;
        }

        if (typeof this.coreLogic === 'function') {
            return this.coreLogic(context);
        }
        return this.definition.coreLogic(context);
    }

    async _validatePathRule(rule, args, dependencies) {
        const { FileSystemManager, UserManager, ErrorHandler } = dependencies;
        const validatedPathsForRule = [];
        const currentUser = UserManager.getCurrentUser().name;

        const indices = rule.argIndex === 'all'
            ? args.map((_, i) => i)
            : [rule.argIndex];

        for (const index of indices) {
            if (index >= args.length) {
                if (rule.options?.required !== false) {
                    return ErrorHandler.createError(`missing path argument.`);
                }
                continue;
            }

            const pathArg = args[index];
            const pathValidationResult = FileSystemManager.validatePath(pathArg, rule.options || {});

            if (!pathValidationResult.success) {
                return ErrorHandler.createError(pathValidationResult.error);
            }

            const { node, resolvedPath } = pathValidationResult.data;

            if (rule.permissions) {
                for (const perm of rule.permissions) {
                    if (node && !FileSystemManager.hasPermission(node, currentUser, perm)) {
                        return ErrorHandler.createError(`'${pathArg}': Permission denied`);
                    }
                }
            }

            if (rule.options && rule.options.ownershipRequired && node) {
                if (!FileSystemManager.canUserModifyNode(node, currentUser)) {
                    return ErrorHandler.createError(`changing permissions of '${pathArg}': Operation not permitted`);
                }
            }

            validatedPathsForRule.push({ arg: pathArg, node, resolvedPath });
        }

        return ErrorHandler.createSuccess(validatedPathsForRule);
    }
}

window.Command = Command;