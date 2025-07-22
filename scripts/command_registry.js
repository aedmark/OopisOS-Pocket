const CommandRegistry = (() => {
    "use strict";

    const commandDefinitions = {};

    function register(commandInstance) {
        if (commandInstance && commandInstance.commandName) {
            // Store the entire instance, which includes the definition
            commandDefinitions[commandInstance.commandName] = commandInstance;
        } else {
            console.error("Attempted to register an invalid command instance:", commandInstance);
        }
    }

    function getDefinitions() {
        // Return the definitions from the stored instances
        const definitionsOnly = {};
        for (const key in commandDefinitions) {
            definitionsOnly[key] = commandDefinitions[key].definition;
        }
        return definitionsOnly;
    }

    // Expose the instances themselves if needed by the executor
    function getCommands() {
        return commandDefinitions;
    }

    return {
        register,
        getDefinitions,
        getCommands,
    };
})();