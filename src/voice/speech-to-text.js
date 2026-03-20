/**
 * Speech-to-Text using Web Speech API
 * Push-to-talk style microphone input
 */

export class SpeechToText {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onResult = null;
        this.onStart = null;
        this.onEnd = null;
        this.onError = null;
        this.supported = false;

        this.init();
    }

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }

        this.supported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.recognition.continuous = false;

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (this.onResult) this.onResult(transcript);
        };

        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.onStart) this.onStart();
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (this.onEnd) this.onEnd();
        };

        this.recognition.onerror = (event) => {
            this.isListening = false;
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
                if (this.onError) this.onError(event.error);
            }
            if (this.onEnd) this.onEnd();
        };
    }

    start() {
        if (!this.supported || this.isListening) return;
        try {
            this.recognition.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
        }
    }

    stop() {
        if (!this.supported || !this.isListening) return;
        try {
            this.recognition.stop();
        } catch (e) {
            // ignore
        }
    }
}
