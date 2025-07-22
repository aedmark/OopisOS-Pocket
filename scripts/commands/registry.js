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

  // Expose the instances themselves
  getCommands() {
    return this.commandDefinitions;
  }
}