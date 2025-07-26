// scripts/commands/nc.js
window.NcCommand = class NcCommand extends Command {
    constructor() {
        super({
            commandName: "nc",
            description: "Netcat utility for network communication.",
            helpText: `Usage: nc [--listen [--exec]] | [<targetId> "<message>"]
      A utility for network communication between OopisOS instances.

      OPTIONS:
        --listen              - Puts the terminal in listening mode, printing messages.
        --exec                - With --listen, executes incoming messages as commands.
                                WARNING: This is a major security risk. Only use this
                                with trusted peers. Requires root privileges.
        <targetId> "<message>" - Sends a direct message to another instance.`,
            flagDefinitions: [
                { name: "listen", short: "--listen" },
                { name: "exec", short: "--exec" },
            ]
        });
    }

    async coreLogic(context) {
        const { args, flags, currentUser, dependencies } = context;
        const { NetworkManager, ErrorHandler, CommandExecutor } = dependencies;

        if (flags.listen) {
            if (flags.exec && currentUser !== 'root') {
                return ErrorHandler.createError("nc: --exec requires root privileges.");
            }

            const mode = flags.exec ? 'execute' : 'print';
            dependencies.OutputManager.appendToOutput(`Listening for messages on instance ${NetworkManager.getInstanceId()} in '${mode}' mode... (Press Ctrl+C to stop)`);

            NetworkManager.setListenCallback((payload) => {
                const { sourceId, data } = payload;
                if (flags.exec) {
                    dependencies.OutputManager.appendToOutput(`[NET EXEC from ${sourceId}]> ${data}`);
                    CommandExecutor.processSingleCommand(data, { isInteractive: false });
                } else {
                    dependencies.OutputManager.appendToOutput(`[NET] From ${sourceId}: ${data}`);
                }
            });

            return ErrorHandler.createSuccess();
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