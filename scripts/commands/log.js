// scripts/commands/log.js
class LogCommand extends Command {
  constructor() {
    super({
      commandName: "log",
      dependencies: ["apps/log/log_ui.js", "apps/log/log_manager.js"],
      applicationModules: ["LogManager", "LogUI", "App"],
      description: "A personal, timestamped journal and log application.",
      helpText: `
    Usage: log ["entry text"]
    DESCRIPTION
    The 'log' command is your personal journal within OopisOS.
    Running 'log' with a quoted string as an argument will instantly
    create a new, timestamped journal entry without opening the app.
    Running 'log' with no arguments launches the full-screen application,
    allowing you to view, search, and manage all your entries.
    EXAMPLES
    log "Finished the first draft of the proposal."
    Creates a new entry with the specified text.
    log
    Opens the main journal application.
    `,
      argValidation: {
        max: 1,
        error: 'Usage: log ["quick entry text"]',
      },
    });
  }

  async coreLogic(context) {

    const { args, currentUser, options, dependencies } = context;
    const { ErrorHandler, LogManager, LogUI, App, AppLayerManager, Config } = dependencies;

    try {
      if (!options.isInteractive) {
        return ErrorHandler.createError(
            "log: Can only be run in interactive mode."
        );
      }

      if (
          typeof LogManager === "undefined" ||
          typeof LogUI === "undefined" ||
          typeof App === "undefined"
      ) {
        return ErrorHandler.createError(
            "log: The Log application module is not loaded."
        );
      }

      if (args.length === 1) {
        const entryText = args[0];
        const logManager = new LogManager(); // Create an instance to use its methods
        logManager.setDependencies(dependencies);
        const result = await logManager.quickAdd(entryText, currentUser);
        if (result.success) {
          return ErrorHandler.createSuccess(result.message, {
            messageType: Config.CSS_CLASSES.SUCCESS_MSG,
          });
        } else {
          return ErrorHandler.createError(result.error);
        }
      }

      // Launch the full application using the AppLayerManager
      AppLayerManager.show(new LogManager(), { dependencies });

      return ErrorHandler.createSuccess("");
    } catch (e) {
      return ErrorHandler.createError(
          `log: An unexpected error occurred: ${e.message}`
      );
    }

  }
}