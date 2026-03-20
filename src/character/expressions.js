/**
 * Expression detection from AI response text
 * Parses emotion tags or detects sentiment keywords
 */

const EMOTION_KEYWORDS = {
    happy: ['happy', 'glad', 'great', 'wonderful', 'love', 'yay', 'haha', 'lol', '😄', '😊', '❤️', 'awesome', 'amazing', 'fantastic', 'excited', 'joy'],
    sad: ['sad', 'sorry', 'unfortunately', 'miss', 'lonely', 'cry', '😢', '😭', 'tragic', 'heartbreak'],
    surprised: ['wow', 'whoa', 'really', 'no way', 'oh my', 'unbelievable', '😮', '😲', 'shocked', 'amazing'],
    thinking: ['hmm', 'let me think', 'interesting', 'consider', 'perhaps', 'maybe', 'well', '🤔', 'wonder', 'actually'],
    excited: ['awesome', 'incredible', 'yes!', 'absolutely', 'definitely', '🎉', '🔥', 'epic', 'let\'s go'],
};

// Parse [emotion:xxx] tags from AI response
function parseEmotionTag(text) {
    const match = text.match(/\[emotion:(\w+)\]/i);
    if (match) {
        return match[1].toLowerCase();
    }
    return null;
}

// Strip emotion tags from display text
export function stripEmotionTags(text) {
    return text.replace(/\[emotion:\w+\]/gi, '').trim();
}

// Detect expression from text content
export function detectExpression(text) {
    // First try explicit emotion tags
    const tagged = parseEmotionTag(text);
    if (tagged && ['happy', 'sad', 'surprised', 'thinking', 'excited', 'relaxed'].includes(tagged)) {
        return tagged;
    }

    // Fall back to keyword detection
    const lower = text.toLowerCase();
    let bestMatch = 'relaxed';
    let bestScore = 0;

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = emotion;
        }
    }

    return bestScore > 0 ? bestMatch : 'relaxed';
}
