// gem/scripts/commands/command_base.js
class Command {
    constructor(definition) {
        if (!definition || !definition.commandName) {
            throw new Error("Command definition must include a commandName.");
        }
        this.definition = definition;
        this.commandName = definition.commandName;
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
        if (this.definition.validations && this.definition.validations.args) {
            const argValidation = Utils.validateArguments(
                remainingArgs,
                this.definition.validations.args
            );
            if (!argValidation.isValid) {
                const errorMsg = this.definition.validations.args.error || argValidation.errorDetail;
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

        // Handle input streams for commands like cat, grep, etc.
        if (this.definition.isInputStream) {
            // This logic will be moved from the CommandExecutor into here
            // For now, we assume it's pre-processed and passed in options.
        }

        return this.definition.coreLogic(context);
    }

    /**
     * A helper to process a single path validation rule.
     */
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

// Make the class globally available or export it
window.Command = Command;