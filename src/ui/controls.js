/**
 * Controls bar — mic, voice toggle, fullscreen, chat toggle
 */

export class Controls {
    constructor() {
        this.micBtn = document.getElementById('btn-mic');
        this.togglePanel = document.getElementById('btn-toggle-panel');
        this.toggleVoice = document.getElementById('btn-toggle-voice');
        this.fullscreenBtn = document.getElementById('btn-fullscreen');

        this.onMicStart = null;
        this.onMicStop = null;
        this.onTogglePanel = null;
        this.onToggleVoice = null;

        this.setupEvents();
    }

    setupEvents() {
        // Mic — push to talk (mousedown/mouseup)
        this.micBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.micBtn.classList.add('recording');
            if (this.onMicStart) this.onMicStart();
        });

        this.micBtn.addEventListener('mouseup', () => {
            this.micBtn.classList.remove('recording');
            if (this.onMicStop) this.onMicStop();
        });

        this.micBtn.addEventListener('mouseleave', () => {
            if (this.micBtn.classList.contains('recording')) {
                this.micBtn.classList.remove('recording');
                if (this.onMicStop) this.onMicStop();
            }
        });

        // Touch events for mobile
        this.micBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.micBtn.classList.add('recording');
            if (this.onMicStart) this.onMicStart();
        });

        this.micBtn.addEventListener('touchend', () => {
            this.micBtn.classList.remove('recording');
            if (this.onMicStop) this.onMicStop();
        });

        // Toggle chat panel
        this.togglePanel.addEventListener('click', () => {
            if (this.onTogglePanel) this.onTogglePanel();
        });

        // Toggle voice
        this.toggleVoice.addEventListener('click', () => {
            this.toggleVoice.classList.toggle('active');
            if (this.onToggleVoice) this.onToggleVoice();
        });

        // Fullscreen
        this.fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => { });
            } else {
                document.exitFullscreen().catch(() => { });
            }
        });

        // Mark voice as active by default
        this.toggleVoice.classList.add('active');
    }

    setMicRecording(isRecording) {
        this.micBtn.classList.toggle('recording', isRecording);
    }
}
