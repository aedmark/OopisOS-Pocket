// scripts/commands/ping.js
window.PingCommand = class PingCommand extends Command {
    constructor() {
        super({
            commandName: "ping",
            description: "Sends a request to a network host or OopisOS instance.",
            helpText: `Usage: ping <hostname_or_instanceId>
      Send a request to a host to check for connectivity.
      DESCRIPTION
      - For a standard hostname/URL, it sends a lightweight request to the
        specified host to determine if it is reachable.
      - For an OopisOS instance ID (e.g., oos-123456-789), it sends a
        special 'ping' message and waits for a 'pong' to measure the
        round-trip time between instances.
      EXAMPLES
      ping oopisos.com
      ping oos-1672533600000-123`,
            validations: {
                args: { exact: 1, error: "Usage: ping <hostname_or_instanceId>" }
            },
        });
    }

    async coreLogic(context) {
        const { args, dependencies } = context;
        const { ErrorHandler, OutputManager, Config, NetworkManager } = dependencies;
        const target = args[0];

        // Check if it's an OopisOS instance ID
        if (target.startsWith('oos-')) {
            await OutputManager.appendToOutput(`Pinging OopisOS instance ${target}...`);
            try {
                const rtt = await NetworkManager.sendPing(target);
                return ErrorHandler.createSuccess(
                    `Pong from ${target}: time=${rtt}ms`,
                    { messageType: Config.CSS_CLASSES.SUCCESS_MSG }
                );
            } catch (e) {
                return ErrorHandler.createError(`Request to ${target} timed out.`);
            }
        }

        // Existing logic for web hosts
        let host = target;
        if (!host.startsWith('http://') && !host.startsWith('https://')) {
            host = 'https://' + host;
        }

        let url;
        try {
            url = new URL(host);
        } catch (e) {
            return ErrorHandler.createError(`ping: invalid URL: ${host}`);
        }

        await OutputManager.appendToOutput(`PING ${url.hostname} (${url.origin})...`);
        const startTime = performance.now();
        try {
            await fetch(url.origin, { method: 'HEAD', mode: 'no-cors' });
            const endTime = performance.now();
            const timeTaken = (endTime - startTime).toFixed(2);
            return ErrorHandler.createSuccess(
                `Reply from ${url.hostname}: time=${timeTaken}ms`,
                { messageType: Config.CSS_CLASSES.SUCCESS_MSG }
            );
        } catch (e) {
            if (e instanceof TypeError) {
                return ErrorHandler.createError(`Request to ${url.hostname} failed: No route to host.`);
            }
            return ErrorHandler.createError(`ping: an unexpected error occurred: ${e.message}`);
        }
    }
}