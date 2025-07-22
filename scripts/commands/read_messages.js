// /scripts/commands/read_messages.js

(() => {
  "use strict";

    class ReadMessagesCommand extends Command {
    constructor() {
      super({
      commandName: "read_messages",
      description: "Reads messages from the job's own message queue.",
      helpText: "Usage: read_messages (must be run within a background job)",
      argValidation: { exact: 0 },
      });
    }

    async coreLogic(context) {
      
            const { options, dependencies } = context;
            const { ErrorHandler, MessageBusManager } = dependencies;
            const jobId = options?.jobId;
      
            if (jobId === undefined) {
              return ErrorHandler.createError(
                  "read_messages: can only be run from within a background job."
              );
            }
      
            const messages = MessageBusManager.getMessages(jobId);
      
            if (messages.length === 0) {
              return ErrorHandler.createSuccess("");
            }
      
            return ErrorHandler.createSuccess(messages.join("\n"));
          
    }
  }

  CommandRegistry.register(new ReadMessagesCommand());
})();