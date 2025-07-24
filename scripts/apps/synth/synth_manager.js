// scripts/apps/synth/synth_manager.js
window.SynthManager = class SynthManager extends App {
    constructor() {
        super();
        this.state = {};
        this.dependencies = {};
        this.callbacks = {};
        this.ui = null;
    }

    enter(appLayer, options = {}) {
        if (this.isActive) return;

        this.dependencies = options.dependencies;
        this.callbacks = this._createCallbacks();

        this.state = {
            octave: 4,
            activeNotes: new Set(),
        };

        this.isActive = true;

        this.ui = new this.dependencies.SynthUI(this.state, this.callbacks, this.dependencies);
        this.container = this.ui.getContainer();
        appLayer.appendChild(this.container);
        this.container.focus();
    }

    exit() {
        if (!this.isActive) return;
        const { AppLayerManager } = this.dependencies;

        if (this.ui) {
            this.ui.hideAndReset();
        }
        AppLayerManager.hide(this);
        this.isActive = false;
        this.state = {};
        this.ui = null;
    }

    handleKeyDown(event) {
        // Global escape hatch
        if (event.key === "Escape") {
            this.exit();
        }
    }

    _createCallbacks() {
        const keyToNoteMap = {
            'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E', 'f': 'F',
            't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A', 'u': 'A#', 'j': 'B',
            'k': 'C', 'o': 'C#', 'l': 'D', 'p': 'D#'
        };

        return {
            onKeyDown: (key) => {
                const { SoundManager } = this.dependencies;
                const noteName = keyToNoteMap[key];

                if (key === 'z') {
                    this.state.octave = Math.max(1, this.state.octave - 1);
                    this.ui.updateOctaveDisplay(this.state.octave);
                    return;
                }
                if (key === 'x') {
                    this.state.octave = Math.min(7, this.state.octave + 1);
                    this.ui.updateOctaveDisplay(this.state.octave);
                    return;
                }

                if (noteName && !this.state.activeNotes.has(noteName)) {
                    const octave = this.state.octave + (key === 'k' || key === 'o' || key === 'l' || key === 'p' ? 1 : 0);
                    const fullNote = `${noteName}${octave}`;

                    if (!SoundManager.isInitialized) {
                        SoundManager.initialize().then(() => {
                            SoundManager.synth.triggerAttack(fullNote);
                        });
                    } else {
                        SoundManager.synth.triggerAttack(fullNote);
                    }
                    this.state.activeNotes.add(fullNote);
                    this.ui.updateKeyAppearance(fullNote, true);
                }
            },
            onKeyUp: (key) => {
                const { SoundManager } = this.dependencies;
                const noteName = keyToNoteMap[key];

                if (noteName) {
                    const octave = this.state.octave + (key === 'k' || key === 'o' || key === 'l' || key === 'p' ? 1 : 0);
                    const fullNote = `${noteName}${octave}`;
                    if (SoundManager.isInitialized) {
                        SoundManager.synth.triggerRelease(fullNote);
                    }
                    this.state.activeNotes.delete(fullNote);
                    this.ui.updateKeyAppearance(fullNote, false);
                }
            },
            onExit: this.exit.bind(this),
        };
    }
}