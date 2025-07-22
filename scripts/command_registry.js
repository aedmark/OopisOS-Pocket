// scripts/command_registry.js

class CommandRegistry {
    constructor() {
        this.commandDefinitions = {};
    }

    register(commandInstance) {
        if (commandInstance && commandInstance.commandName) {
            // Store the entire instance, which includes the definition
            this.commandDefinitions[commandInstance.commandName] = commandInstance;
        } else {
            console.error(
                "Attempted to register an invalid command instance:",
                commandInstance
            );
        }
    }

    getDefinitions() {
        // Return the definitions from the stored instances
        const definitionsOnly = {};
        for (const key in this.commandDefinitions) {
            definitionsOnly[key] = this.commandDefinitions[key].definition;
        }
        return definitionsOnly;
    }

    // Expose the instances themselves if needed by the executor
    getCommands() {
        return this.commandDefinitions;
    }
}