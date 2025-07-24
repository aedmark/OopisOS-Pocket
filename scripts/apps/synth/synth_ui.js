// scripts/apps/synth/synth_ui.js
window.SynthUI = class SynthUI {
    constructor(initialState, callbacks, dependencies) {
        this.elements = {};
        this.callbacks = callbacks;
        this.dependencies = dependencies;
        this._buildLayout(initialState);
        this._addEventListeners();
    }

    getContainer() {
        return this.elements.container;
    }

    hideAndReset() {
        // Clean up listeners to prevent artifacts from lingering in the void
        document.removeEventListener("keydown", this._boundKeyDown);
        document.removeEventListener("keyup", this._boundKeyUp);
        if (this.elements.container) {
            this.elements.container.remove();
        }
        this.elements = {};
    }

    updateKeyAppearance(note, isActive) {
        const keyElement = this.elements.container.querySelector(`[data-note="${note}"]`);
        if (keyElement) {
            keyElement.classList.toggle('active', isActive);
        }
    }

    updateOctaveDisplay(octave) {
        if (this.elements.octaveDisplay) {
            this.elements.octaveDisplay.textContent = `Octave: ${octave} (Z/X to change)`;
        }
    }

    _buildLayout(initialState) {
        const { Utils } = this.dependencies;
        const keys = [
            { note: `C${initialState.octave}`, key: "A", type: "white" },
            { note: `C#${initialState.octave}`, key: "W", type: "black" },
            { note: `D${initialState.octave}`, key: "S", type: "white" },
            { note: `D#${initialState.octave}`, key: "E", type: "black" },
            { note: `E${initialState.octave}`, key: "D", type: "white" },
            { note: `F${initialState.octave}`, key: "F", type: "white" },
            { note: `F#${initialState.octave}`, key: "T", type: "black" },
            { note: `G${initialState.octave}`, key: "G", type: "white" },
            { note: `G#${initialState.octave}`, key: "Y", type: "black" },
            { note: `A${initialState.octave}`, key: "H", type: "white" },
            { note: `A#${initialState.octave}`, key: "U", type: "black" },
            { note: `B${initialState.octave}`, key: "J", type: "white" },
            { note: `C${initialState.octave + 1}`, key: "K", type: "white" },
            { note: `C#${initialState.octave + 1}`, key: "O", type: "black" },
            { note: `D${initialState.octave + 1}`, key: "L", type: "white" },
            { note: `D#${initialState.octave + 1}`, key: "P", type: "black" },
        ];

        const keyElements = keys.map(k =>
            Utils.createElement('div', {
                className: `synth-key ${k.type}`,
                'data-note': k.note,
                'data-key': k.key.toLowerCase()
            }, Utils.createElement('span', { textContent: k.key }))
        );

        const keyboard = Utils.createElement('div', { className: 'synth-keyboard' }, keyElements);

        this.elements.octaveDisplay = Utils.createElement('div', { className: 'synth-octave-display' });
        this.updateOctaveDisplay(initialState.octave);

        const header = Utils.createElement('header', { className: 'synth-header' }, [
            Utils.createElement('h2', { textContent: 'OopisOS Synthesizer' }),
            Utils.createElement('button', {
                className: 'synth-exit-btn',
                textContent: '×',
                title: 'Exit Synth',
                eventListeners: { click: () => this.callbacks.onExit() }
            })
        ]);

        this.elements.container = Utils.createElement('div', {
            id: 'synth-container',
            className: 'synth-container',
            tabindex: "-1" // Make it focusable
        }, [header, keyboard, this.elements.octaveDisplay]);
    }

    _addEventListeners() {
        this._boundKeyDown = (e) => this.callbacks.onKeyDown(e.key.toLowerCase());
        this._boundKeyUp = (e) => this.callbacks.onKeyUp(e.key.toLowerCase());

        this.elements.container.addEventListener("keydown", this._boundKeyDown);
        this.elements.container.addEventListener("keyup", this._boundKeyUp);
    }
}