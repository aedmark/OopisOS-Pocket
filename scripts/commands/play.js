// scripts/commands/play.js
window.PlayCommand = class PlayCommand extends Command {
    constructor() {
        super({
            commandName: "play",
            description: "Plays a musical note for a specific duration.",
            helpText: `Usage: play <note> <duration>
      Plays a musical note using the system synthesizer.
      DESCRIPTION
      The play command uses the Tone.js synthesizer to play a musical note.
      - <note>: Standard musical notation (e.g., C4, F#5, Ab3).
      - <duration>: Note duration (e.g., 4n for a quarter note, 8n for an eighth note, 1m for a whole measure).
      EXAMPLES
      play C4 4n
      Plays a middle C for a quarter note.
      play G#5 8n
      Plays a G-sharp in the 5th octave for an eighth note.`,
            argValidation: {
                exact: 2,
                error: "Usage: play <note> <duration>",
            },
        });
    }

    async coreLogic(context) {
        const { args, dependencies } = context;
        const { SoundManager, ErrorHandler } = dependencies;
        const [note, duration] = args;

        if (!SoundManager.isInitialized) {
            await SoundManager.initialize();
            if (!SoundManager.isInitialized) {
                return ErrorHandler.createError(
                    "play: AudioContext could not be started. Please click or type first."
                );
            }
        }

        SoundManager.playNote(note, duration);

        // Convert Tone.js duration to seconds, then to milliseconds for the delay
        const durationInSeconds = new Tone.Time(duration).toSeconds();
        const durationInMs = Math.ceil(durationInSeconds * 1000);

        // Wait for the note to finish playing before the command resolves
        await new Promise(resolve => setTimeout(resolve, durationInMs));

        return ErrorHandler.createSuccess();
    }
};