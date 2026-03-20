/**
 * Chat history manager — persists to localStorage
 */

const STORAGE_KEY = 'neel2d_chat_history';

export class ChatHistory {
    constructor() {
        this.messages = this.load();
    }

    load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    save() {
        try {
            // Keep last 100 messages
            if (this.messages.length > 100) {
                this.messages = this.messages.slice(-100);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages));
        } catch {
            // localStorage might be full
        }
    }

    add(role, text) {
        const msg = {
            role,
            text,
            time: Date.now(),
        };
        this.messages.push(msg);
        this.save();
        return msg;
    }

    clear() {
        this.messages = [];
        localStorage.removeItem(STORAGE_KEY);
    }

    getAll() {
        return this.messages;
    }
}
