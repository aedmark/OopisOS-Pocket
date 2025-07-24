// gem/scripts/commands/ping.js
window.PingCommand = class PingCommand extends Command {
    constructor() {
        super({
            commandName: "ping",
            description: "Sends a request to a network host to check for connectivity.",
            helpText: `Usage: ping <hostname_or_url>
      Send a request to a host to check for connectivity.
      DESCRIPTION
      The ping command sends a lightweight request to the specified
      hostname or URL to determine if it is reachable. It measures the
      time it takes to receive a response.
      Note: Due to browser security restrictions, ping is subject to
      Cross-Origin Resource Sharing (CORS) policies and may not be able
      to reach all hosts. It is best used for checking servers
      that are known to have permissive CORS settings.
      EXAMPLES
      ping oopisos.com
      Checks if the oopisos.com server is responding.`,
            validations: {
                args: {
                    exact: 1,
                    error: "Usage: ping <hostname_or_url>"
                }
            },
        });
    }

    async coreLogic(context) {
        const { args, dependencies } = context;
        const { ErrorHandler, OutputManager, Config } = dependencies;
        let host = args[0];

        // Ensure the host has a protocol for the fetch API
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
            // Using 'no-cors' mode allows us to get a response from servers without CORS,
            // though we can't inspect the body or exact status. It's a true "ping".
            const response = await fetch(url.origin, { method: 'HEAD', mode: 'no-cors' });
            const endTime = performance.now();
            const timeTaken = (endTime - startTime).toFixed(2);

            // A successful 'no-cors' request has a status of 0 but is a success.
            return ErrorHandler.createSuccess(
                `Reply from ${url.hostname}: time=${timeTaken}ms`,
                { messageType: Config.CSS_CLASSES.SUCCESS_MSG }
            );

        } catch (e) {
            // A TypeError here usually indicates a network error or that the host is down.
            if (e instanceof TypeError) {
                return ErrorHandler.createError(`Request to ${url.hostname} failed: No route to host.`);
            }
            return ErrorHandler.createError(`ping: an unexpected error occurred: ${e.message}`);
        }
    }
}