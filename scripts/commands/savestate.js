// scripts/commands/savestate.js
window.SavestateCommand = class SavestateCommand extends Command {
    constructor() {
        super({
            commandName: "savestate",
            description: "Manually saves a snapshot of the current session.",
            helpText: `Usage: savestate
      Manually save a snapshot of the current session and file system.
      DESCRIPTION
      The savestate command creates a snapshot of the current OopisOS
      environment for the active user. This snapshot includes:
      - The entire file system at the moment of saving.
      - The current state of the terminal screen.
      - The complete command history.
      This saved state can be restored later using the 'loadstate'
      command. Each user has their own separate saved state.
      Running 'savestate' will overwrite any previously saved state
      for the current user.`,
            argValidation: {
                exact: 0,
            },
        });
    }

    async coreLogic(context) {
        const { dependencies } = context;
        const { SessionManager, ErrorHandler } = dependencies;
        const result = await SessionManager.saveManualState();

        if (result.success) {
            return ErrorHandler.createSuccess(result.data.message);
        } else {
            return ErrorHandler.createError(result.error);
        }
    }
}