/**
 * Neel2D — Main Application Entry Point
 * Initializes all systems and wires them together
 */

import { CharacterRenderer } from './character/renderer.js';
import { detectExpression, stripEmotionTags } from './character/expressions.js';
import { GeminiChat } from './chat/gemini.js';
import { ChatHistory } from './chat/history.js';
import { SpeechToText } from './voice/speech-to-text.js';
import { TextToSpeech } from './voice/text-to-speech.js';
import { ChatPanel } from './ui/chat-panel.js';
import { Controls } from './ui/controls.js';
import { initParticles } from './bg/particles.js';

// ---- Initialize Systems ----
const characterCanvas = document.getElementById('character-canvas');
const character = new CharacterRenderer(characterCanvas);
const gemini = new GeminiChat();
const chatHistory = new ChatHistory();
const stt = new SpeechToText();
const tts = new TextToSpeech();
const chatPanel = new ChatPanel();
const controls = new Controls();

// Background particles
initParticles(document.getElementById('bg-particles'));

// ---- Load persisted chat history ----
const savedMessages = chatHistory.getAll();
for (const msg of savedMessages) {
    chatPanel.addMessage(msg.role, msg.text, msg.time);
}

// ---- Wire up: Chat Send ----
chatPanel.onSend = async (text) => {
    // Add user message
    chatPanel.addMessage('user', text);
    chatHistory.add('user', text);

    // Show thinking state
    chatPanel.showThinking();
    character.setExpression('thinking');

    try {
        const response = await gemini.sendMessage(text);
        chatPanel.hideThinking();

        // Detect expression and clean text
        const expression = detectExpression(response);
        const cleanText = stripEmotionTags(response);

        // Update UI
        character.setExpression(expression);
        chatPanel.setMood(expression);
        chatPanel.addMessage('ai', cleanText);
        chatHistory.add('ai', cleanText);

        // Speak the response
        character.setTalking(true);
        tts.speak(cleanText);
    } catch (err) {
        chatPanel.hideThinking();
        character.setExpression('sad');
        chatPanel.addMessage('ai', 'Oops, something went wrong... Try again? 💫');
        console.error(err);
    }
};

// ---- Wire up: Chat Clear ----
chatPanel.onClear = () => {
    chatHistory.clear();
    gemini.clearHistory();
    character.setExpression('relaxed');
    chatPanel.setMood('relaxed');
};

// ---- Wire up: Voice ----
stt.onResult = (transcript) => {
    chatPanel.setInputText(transcript);
    // Auto-send voice input
    chatPanel.onSend(transcript);
};

stt.onStart = () => {
    controls.setMicRecording(true);
};

stt.onEnd = () => {
    controls.setMicRecording(false);
};

// Mic button — push-to-talk
controls.onMicStart = () => stt.start();
controls.onMicStop = () => stt.stop();

// Voice toggle
controls.onToggleVoice = () => tts.toggle();

// Chat panel toggle
controls.onTogglePanel = () => chatPanel.togglePanel();

// ---- Wire up: TTS → Character ----
tts.onStart = () => character.setTalking(true);
tts.onEnd = () => {
    character.setTalking(false);
    // Return to relaxed after speaking
    setTimeout(() => {
        if (!gemini.isProcessing) {
            character.setExpression('relaxed');
            chatPanel.setMood('relaxed');
        }
    }, 2000);
};

// ---- Animation Loop ----
function animate(timestamp) {
    character.render(timestamp);
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// ---- Focus chat input ----
document.getElementById('chat-input').focus();

console.log('✨ Neel2D initialized');
