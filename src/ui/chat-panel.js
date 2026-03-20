/**
 * Chat Panel UI Controller
 */

export class ChatPanel {
    constructor() {
        this.messagesEl = document.getElementById('chat-messages');
        this.inputEl = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('btn-send');
        this.clearBtn = document.getElementById('btn-clear-chat');
        this.toggleBtn = document.getElementById('btn-toggle-chat');
        this.panelEl = document.getElementById('chat-panel');
        this.typingEl = document.getElementById('typing-status');
        this.moodEl = document.getElementById('char-mood');

        this.onSend = null;
        this.onClear = null;

        this.setupEvents();
    }

    setupEvents() {
        // Send on button click
        this.sendBtn.addEventListener('click', () => this.handleSend());

        // Send on Enter key
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // Clear chat
        this.clearBtn.addEventListener('click', () => {
            this.clearMessages();
            if (this.onClear) this.onClear();
        });

        // Toggle panel
        this.toggleBtn.addEventListener('click', () => this.togglePanel());
    }

    handleSend() {
        const text = this.inputEl.value.trim();
        if (!text) return;
        this.inputEl.value = '';
        if (this.onSend) this.onSend(text);
    }

    addMessage(role, text, time) {
        // Remove welcome message if present
        const welcome = this.messagesEl.querySelector('.welcome-msg');
        if (welcome) welcome.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${role}`;

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = text;

        const timeEl = document.createElement('div');
        timeEl.className = 'msg-time';
        const d = new Date(time || Date.now());
        timeEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.appendChild(bubble);
        msgDiv.appendChild(timeEl);
        this.messagesEl.appendChild(msgDiv);

        this.scrollToBottom();
    }

    showThinking() {
        const thinkDiv = document.createElement('div');
        thinkDiv.className = 'msg ai thinking-msg';
        thinkDiv.innerHTML = `
      <div class="msg-bubble">
        <div class="thinking-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
        this.messagesEl.appendChild(thinkDiv);
        this.scrollToBottom();

        this.typingEl.textContent = 'Thinking...';
        this.typingEl.classList.add('thinking');
    }

    hideThinking() {
        const thinkMsg = this.messagesEl.querySelector('.thinking-msg');
        if (thinkMsg) thinkMsg.remove();

        this.typingEl.textContent = 'Online';
        this.typingEl.classList.remove('thinking');
    }

    setMood(mood) {
        this.moodEl.textContent = mood;
    }

    clearMessages() {
        this.messagesEl.innerHTML = `
      <div class="welcome-msg">
        <div class="welcome-icon">✨</div>
        <p>Say hello to <strong>Neel</strong>! Type a message or press the mic button to talk.</p>
      </div>
    `;
    }

    togglePanel() {
        this.panelEl.classList.toggle('minimized');
    }

    showPanel() {
        this.panelEl.classList.remove('minimized');
    }

    hidePanel() {
        this.panelEl.classList.add('minimized');
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        });
    }

    setInputText(text) {
        this.inputEl.value = text;
        this.inputEl.focus();
    }
}
