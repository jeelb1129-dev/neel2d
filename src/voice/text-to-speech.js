/**
 * Text-to-Speech using SpeechSynthesis API
 * Anime-style voice with adjustable pitch/rate
 */

export class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.enabled = true;
        this.speaking = false;
        this.onStart = null;
        this.onEnd = null;
        this.voice = null;
        this.pitch = 1.3;  // Higher pitch for anime style
        this.rate = 1.05;

        // Load voices
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        const voices = this.synth.getVoices();
        // Prefer a female English voice
        this.voice =
            voices.find(v => v.name.includes('Samantha')) ||
            voices.find(v => v.name.includes('Karen')) ||
            voices.find(v => v.name.includes('Female') && v.lang.startsWith('en')) ||
            voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0];
    }

    speak(text) {
        if (!this.enabled || !text) return;

        // Cancel any ongoing speech
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        if (this.voice) utterance.voice = this.voice;
        utterance.pitch = this.pitch;
        utterance.rate = this.rate;
        utterance.volume = 0.85;

        utterance.onstart = () => {
            this.speaking = true;
            if (this.onStart) this.onStart();
        };

        utterance.onend = () => {
            this.speaking = false;
            if (this.onEnd) this.onEnd();
        };

        utterance.onerror = () => {
            this.speaking = false;
            if (this.onEnd) this.onEnd();
        };

        this.synth.speak(utterance);
    }

    stop() {
        this.synth.cancel();
        this.speaking = false;
        if (this.onEnd) this.onEnd();
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) this.stop();
        return this.enabled;
    }
}
