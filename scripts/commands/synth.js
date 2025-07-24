// scripts/commands/synth.js
window.SynthCommand = class SynthCommand extends Command {
    constructor() {
        super({
            commandName: "synth",
            dependencies: [
                "apps/synth/synth_ui.js",
                "apps/synth/synth_manager.js"
            ],
            applicationModules: ["SynthManager", "SynthUI", "App"],
            description: "Launches a basic synthesizer playable with the keyboard.",
            helpText: `Usage: synth
      Launches a simple, interactive synthesizer.
      DESCRIPTION
      Opens a graphical synthesizer application. Use your computer keyboard to play musical notes.
      KEYS
      - QWERTY row (Q, W, E, R...): White keys
      - Number row (2, 3, 5, 6, 7...): Black keys
      - Z / X: Lower/Raise octave`,
            validations: {
                args: {
                    exact: 0
                }
            },
        });
    }

    async coreLogic(context) {
        const { options, dependencies } = context;
        const { ErrorHandler, AppLayerManager, SynthManager } = dependencies;

        if (!options.isInteractive) {
            return ErrorHandler.createError(
                "synth: Can only be run in an interactive session."
            );
        }

        if (typeof SynthManager === "undefined") {
            return ErrorHandler.createError(
                "synth: Synthesizer application module is not loaded."
            );
        }

        AppLayerManager.show(new SynthManager(), { dependencies });

        return ErrorHandler.createSuccess("");
    }
}