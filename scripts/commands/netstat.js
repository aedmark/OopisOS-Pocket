// scripts/commands/netstat.js
window.NetstatCommand = class NetstatCommand extends Command {
    constructor() {
        super({
            commandName: "netstat",
            description: "Shows network status and connections.",
            helpText: `Usage: netstat
      Displays a list of all discovered OopisOS instances and their connection status.

      DESCRIPTION
      - Lists your own instance ID.
      - Shows remote instances discovered via the signaling server.
      - Indicates which peers have an active WebRTC connection.`
        });
    }

    async coreLogic(context) {
        const { dependencies } = context;
        const { NetworkManager, ErrorHandler } = dependencies;

        const output = [];
        output.push(`Your Instance ID: ${NetworkManager.getInstanceId()}`);
        output.push("\nDiscovered Remote Instances:");

        const remoteInstances = NetworkManager.getRemoteInstances();
        if (remoteInstances.length === 0) {
            output.push("  (None)");
        } else {
            remoteInstances.forEach(id => {
                const peer = NetworkManager.getPeers().get(id);
                const status = peer ? ` (Status: ${peer.connectionState})` : " (Status: Disconnected)";
                output.push(`  - ${id}${status}`);
            });
        }

        return ErrorHandler.createSuccess(output.join('\n'));
    }
};