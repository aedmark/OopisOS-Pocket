// scripts/commands/sync.js
(() => {
  "use strict";

  const syncCommandDefinition = {
    commandName: "sync",
    description: "Commit filesystem caches to persistent storage.",
    helpText: `Usage: sync

Flush file system buffers.

DESCRIPTION
       The sync command forces a write of all buffered file system data
       in memory (the live fsData object) to the underlying persistent
       storage (IndexedDB).

       While most file operations in OopisOS trigger a save automatically,
       'sync' can be used to ensure all pending changes are written before
       a critical operation or closing the session.`,
    argValidation: {
      exact: 0,
    },
    coreLogic: async (context) => {
      const { dependencies } = context;
      const { ErrorHandler } = dependencies;
      // This command's entire purpose is to represent a state modification.
      // The actual save is handled by the executor when it sees the flag.
      return ErrorHandler.createSuccess("", { stateModified: true });
    },
  };
  CommandRegistry.register(syncCommandDefinition);
})();