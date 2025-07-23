// scripts/commands/beep.js
window.BeepCommand = class BeepCommand extends Command {
    constructor() {
        super({
            commandName: "beep",
            description: "Plays a simple system beep.",
            helpText: `Usage: beep
      Plays a short, simple system tone through the emulated sound card.`
        });
    }

    async coreLogic(context) {
        const { dependencies } = context;
        const { SoundManager, ErrorHandler } = dependencies;

        if (!SoundManager.isInitialized) {
            // Attempt to initialize on first use if not already done
            await SoundManager.initialize();
            if (!SoundManager.isInitialized) {
                return ErrorHandler.createError(
                    "beep: AudioContext could not be started. Please click or type first."
                );
            }
        }

        SoundManager.beep();
        return ErrorHandler.createSuccess();
    }
};