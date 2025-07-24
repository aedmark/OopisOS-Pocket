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
        const { options, dependencies } = context;
        const { ErrorHandler, AppLayerManager, TopManager } = dependencies;

        if (!options.isInteractive) {
            return ErrorHandler.createError(
                "top: Can only be run in an interactive session."
            );
        }

        if (
            typeof TopManager === "undefined" ||
            typeof AppLayerManager === "undefined"
        ) {
            return ErrorHandler.createError(
                "top: Top application module is not loaded."
            );
        }

        AppLayerManager.show(new TopManager(), { dependencies });

        return ErrorHandler.createSuccess("");
    }
}