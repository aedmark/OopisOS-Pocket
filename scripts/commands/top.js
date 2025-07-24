// scripts/commands/top.js
window.TopCommand = class TopCommand extends Command {
    constructor() {
        super({
            commandName: "top",
            dependencies: [
                "apps/top/top_ui.js",
                "apps/top/top_manager.js",
            ],
            applicationModules: ["TopManager", "TopUI", "App"],
            description: "Displays a real-time view of running processes.",
            helpText: `Usage: top
      Provides a dynamic, real-time view of the processes running in OopisOS.
      DESCRIPTION
      The top command opens a full-screen application that lists all active
      background jobs and system processes. The list is updated in real-time.
      KEYBOARD SHORTCUTS
      q - Quit the application.`,
            validations: {
                args: {
                    exact: 0
                }
            },
        });
    }

    async coreLogic(context) {
        const { options, signal, dependencies } = context;
        const { ErrorHandler, AppLayerManager, TopManager } = dependencies;

        if (
            typeof TopManager === "undefined" ||
            typeof AppLayerManager === "undefined"
        ) {
            return ErrorHandler.createError(
                "top: Top application module is not loaded."
            );
        }

        if (options.isInteractive) {
            // If we're interactive, show the beautiful UI!
            AppLayerManager.show(new TopManager(), { dependencies });
            return ErrorHandler.createSuccess("");
        } else {
            // If we're NOT interactive (like in a script), we need to wait patiently.
            // This promise will keep the process alive until it's stopped by a signal (like 'kill').
            return new Promise((_resolve, reject) => {
                if (signal) {
                    signal.addEventListener('abort', () => {
                        // The 'kill' command has spoken! Time to go.
                        reject(new Error(`Operation cancelled. (Reason: ${signal.reason})`));
                    });
                }
                // We just wait here... forever... or until we're told otherwise.
            });
        }
    }
}
