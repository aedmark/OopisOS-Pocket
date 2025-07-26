// scripts/commands/nc.js
window.NcCommand = class NcCommand extends Command {
    constructor() {
        super({
            commandName: "nc",
            description: "Netcat utility for network communication.",
            helpText: `Usage: nc [--listen | <targetId> "<message>"]
      A utility for network communication between OopisOS instances.

      OPTIONS:
        --listen              - Puts the terminal in listening mode.
        <targetId> "<message>" - Sends a direct message to another instance.`,
            flagDefinitions: [
                { name: "listen", short: "--listen" },
            ]
        });
    }

    async coreLogic(context) {
        const { args, flags, dependencies } = context;
        const { NetworkManager, ErrorHandler } = dependencies;

        if (flags.listen) {
            return new Promise((resolve) => {
                dependencies.OutputManager.appendToOutput(`Listening for messages on instance ${NetworkManager.getInstanceId()}... (Press Ctrl+C to stop)`);
                NetworkManager.setListenCallback((message) => {
                    dependencies.OutputManager.appendToOutput(message);
                });

                // This is a simplified listen mode. A real implementation would handle Ctrl+C.
                // For now, it just sets the callback and resolves. The user can continue typing.
            });
        }

        if (args.length !== 2) {
            return ErrorHandler.createError("Usage: nc <targetId> \"<message>\"");
        }

        const targetId = args[0];
        const message = args[1];

        NetworkManager.sendMessage(targetId, 'direct_message', message);
        return ErrorHandler.createSuccess();
    }
};