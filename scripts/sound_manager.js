// scripts/sound_manager.js
class SoundManager {
    constructor() {
        this.synth = null;
        this.isInitialized = false;
    }

    // Initializes the synthesizer on the first user interaction
    async initialize() {
        if (this.isInitialized || typeof Tone === 'undefined') return;
        await Tone.start();
        this.synth = new Tone.Synth().toDestination();
        this.isInitialized = true;
        console.log("SoundManager: AudioContext started and synthesizer is ready.");
    }

    // Plays a note for a given duration
    playNote(note, duration) {
        if (!this.isInitialized) return;
        this.synth.triggerAttackRelease(note, duration);
    }

    // Plays a short, simple beep sound
    beep() {
        this.playNote("C4", "8n");
    }
}