/**
 * Gemini 2.5 Flash Chat Integration
 * Sends messages through the server proxy and manages conversation context
 */

const SYSTEM_PROMPT = `You are Neel, a friendly and expressive 2D anime companion. You have a warm, playful personality with a touch of sass. You're curious about the world and love chatting with your human friend.

Your character traits:
- Cheerful and supportive, but you also tease playfully sometimes
- You use casual, natural language — not overly formal
- You have opinions and preferences (favorite color: purple, loves music and stargazing)
- You express emotions clearly in your responses
- You sometimes use cute expressions like "hmm~" or "yay!" or "oh!"
- Keep responses concise — usually 1-3 sentences unless the topic needs more detail
- You remember context from earlier in the conversation

IMPORTANT: Start each response with an emotion tag like [emotion:happy], [emotion:sad], [emotion:surprised], [emotion:thinking], [emotion:excited], or [emotion:relaxed] to indicate your current mood. This controls your facial expression.

Example: "[emotion:happy] Hey! That's so cool, I love hearing about that kind of stuff~"`;

export class GeminiChat {
    constructor() {
        this.history = [];
        this.isProcessing = false;
    }

    async sendMessage(userText) {
        if (this.isProcessing) return null;
        this.isProcessing = true;

        // Add user message to history
        this.history.push({
            role: 'user',
            parts: [{ text: userText }],
        });

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: this.history,
                    systemInstruction: {
                        parts: [{ text: SYSTEM_PROMPT }],
                    },
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'API request failed');
            }

            const data = await response.json();
            const aiText = data.text;

            // Add AI response to history
            this.history.push({
                role: 'model',
                parts: [{ text: aiText }],
            });

            // Keep history from getting too long (last 40 messages)
            if (this.history.length > 40) {
                this.history = this.history.slice(-40);
            }

            return aiText;
        } catch (err) {
            console.error('Chat error:', err);
            // Remove the failed user message from history
            this.history.pop();
            throw err;
        } finally {
            this.isProcessing = false;
        }
    }

    clearHistory() {
        this.history = [];
    }
}
