/**
 * WisprFlowFormatter - AI Dictation Cleaning & Formatting Engine
 * Inspired by Wispr Flow: removes filler words, fixes stutters, processes spoken punctuation,
 * auto-capitalizes, and formats text into selected tone styles (Clean, Professional, Bullet Points, Raw).
 */
class WisprFlowFormatter {
    constructor() {
        // English filler words and phrases
        this.englishFillers = [
            /\b(um+h*|uh+h*|er+h*|ah+h*|hmm+)\b/gi,
            /\b(you know|i mean|so yeah|kind of|sort of|basically|literally|actually)\b/gi,
            /\b(like)\b(?=\s+(?:i|we|you|it|they|he|she|the|a|an|that|this|what|how|why|is|was|were|so|and|to))/gi
        ];

        // Hinglish / Hindi filler words and phrases
        this.hinglishFillers = [
            /\b(matlab|yani|samjhe|kya kehte hain|matlab ki|bhai|so matlab)\b/gi,
            /\b(woh|wese|waise)\b(?=\s+(?:ki|hai|main|humein|aap|tum))/gi
        ];

        // Spoken punctuation mappings
        this.punctuationMap = [
            { pattern: /\s*\b(full stop|period)\b\s*/gi, replacement: '. ' },
            { pattern: /\s*\b(comma)\b\s*/gi, replacement: ', ' },
            { pattern: /\s*\b(question mark)\b\s*/gi, replacement: '? ' },
            { pattern: /\s*\b(exclamation mark|exclamation point)\b\s*/gi, replacement: '! ' },
            { pattern: /\s*\b(colon)\b\s*/gi, replacement: ': ' },
            { pattern: /\s*\b(semicolon)\b\s*/gi, replacement: '; ' },
            { pattern: /\s*\b(dash|hyphen)\b\s*/gi, replacement: ' - ' },
            { pattern: /\s*\b(new line|next line|paragraph)\b\s*/gi, replacement: '\n\n' },
            { pattern: /\s*\b(bullet point|bullet)\b\s*/gi, replacement: '\n• ' },
            // Hindi / Hinglish spoken punctuation
            { pattern: /\s*\b(purn viram|poorna viram)\b\s*/gi, replacement: '. ' },
            { pattern: /\s*\b(nayi line|agli line)\b\s*/gi, replacement: '\n\n' }
        ];
    }

    /**
     * Clean raw dictated text according to specified options
     * @param {string} text 
     * @param {Object} options { mode: 'clean'|'professional'|'bullet_points'|'raw', lang: 'en-US' }
     * @returns {Object} { text: string, stats: { fillersRemoved: number } }
     */
    format(text, options = {}) {
        if (!text || typeof text !== 'string') {
            return { text: '', stats: { fillersRemoved: 0 } };
        }

        const mode = options.mode || 'clean';
        const lang = options.lang || 'en-US';

        if (mode === 'raw') {
            return { text, stats: { fillersRemoved: 0 } };
        }

        let processed = text;
        let fillersRemoved = 0;

        // 1. Remove Filler Words (English & Hinglish)
        const fillerMatches = processed.match(/\b(um|uh|er|ah|hmm|matlab|yani|basically|literally|you know)\b/gi) || [];
        const fillerCountBefore = fillerMatches.length;
        
        const fillerPatterns = [...this.englishFillers, ...this.hinglishFillers];
        for (const pattern of fillerPatterns) {
            processed = processed.replace(pattern, ' ');
        }

        // 2. Remove Stutters / Duplicate Words ("I I want" -> "I want", "the the" -> "the")
        processed = this.removeStutters(processed);

        const remainingMatches = processed.match(/\b(um|uh|er|ah|hmm|matlab|yani|basically|literally|you know)\b/gi) || [];
        fillersRemoved = Math.max(0, fillerCountBefore - remainingMatches.length);

        // 3. Process Spoken Punctuation
        processed = this.processSpokenPunctuation(processed);

        // 4. Normalize Spacing & Fix Punctuation Alignment
        processed = this.cleanPunctuationSpacing(processed);

        // 5. Apply Mode-Specific Transformations
        if (mode === 'professional') {
            processed = this.applyProfessionalStyle(processed);
        } else if (mode === 'bullet_points') {
            processed = this.applyBulletPointsStyle(processed);
        }

        // 6. Sentence Capitalization & 'I' Fix
        processed = this.capitalizeSentences(processed);

        return {
            text: processed.trim(),
            stats: { fillersRemoved }
        };
    }

    /**
     * Removes duplicate word stutters ("the the", "I I", "we we")
     */
    removeStutters(text) {
        return text.replace(/\b(\w+)\s+\1\b/gi, '$1');
    }

    /**
     * Replaces spoken punctuation words with punctuation symbols
     */
    processSpokenPunctuation(text) {
        let result = text;
        for (const item of this.punctuationMap) {
            result = result.replace(item.pattern, item.replacement);
        }
        return result;
    }

    /**
     * Fixes spacing around punctuation (e.g. "word , next" -> "word, next")
     */
    cleanPunctuationSpacing(text) {
        return text
            // Remove multiple spaces
            .replace(/[ \t]+/g, ' ')
            // Remove space before punctuation marks
            .replace(/\s+([.,?!:;])/g, '$1')
            // Ensure space after punctuation if followed by letter
            .replace(/([.,?!:;])([a-zA-Z])/g, '$1 $2')
            // Clean up leading space on newlines
            .replace(/\n\s+/g, '\n');
    }

    /**
     * Capitalizes initial letters of sentences and stand-alone pronoun 'i' -> 'I'
     */
    capitalizeSentences(text) {
        if (!text) return '';
        
        // Capitalize standalone 'i'
        let result = text.replace(/\bi\b/g, 'I');

        // Capitalize start of sentences / paragraphs
        result = result.replace(/(?:^|\n\n?|\. |\? |! |\u2022\s*)([a-z])/g, (match) => match.toUpperCase());

        // Capitalize very first character if needed
        if (result.length > 0) {
            result = result.charAt(0).toUpperCase() + result.slice(1);
        }

        return result;
    }

    /**
     * Polishes text into a professional email style
     */
    applyProfessionalStyle(text) {
        if (!text) return '';
        
        let cleaned = text.trim();
        
        // Remove casual conversational starters if present
        cleaned = cleaned.replace(/^(hey|hi|hello|so|yeah|well)\s*,?\s*/i, '');
        
        // Replace casual phrasing with professional equivalents
        const casualToProfessional = [
            { pattern: /\bcan you\b/gi, replacement: 'could you please' },
            { pattern: /\bthanks a lot\b/gi, replacement: 'thank you very much' },
            { pattern: /\bgonna\b/gi, replacement: 'going to' },
            { pattern: /\bwanna\b/gi, replacement: 'want to' },
            { pattern: /\bgotta\b/gi, replacement: 'need to' },
            { pattern: /\basap\b/gi, replacement: 'as soon as possible' },
            { pattern: /\bby the way\b/gi, replacement: 'incidentally' },
            { pattern: /\blet me know\b/gi, replacement: 'please inform me' }
        ];

        for (const item of casualToProfessional) {
            cleaned = cleaned.replace(item.pattern, item.replacement);
        }

        // Add proper sentence termination if missing
        if (cleaned && !/[.?!:]$/.test(cleaned)) {
            cleaned += '.';
        }

        return cleaned;
    }

    /**
     * Formats text into bullet points
     */
    applyBulletPointsStyle(text) {
        if (!text) return '';

        // Split by existing newlines, periods, or commas if long
        const parts = text.split(/(?:\n+|\. |\? |! )/).map(p => p.trim()).filter(Boolean);
        
        if (parts.length === 0) return text;
        if (parts.length === 1) return `• ${parts[0]}`;

        return parts.map(part => {
            // Remove leading bullet if already present
            const cleanPart = part.replace(/^[\u2022\-\*\d+\.]\s*/, '');
            return `• ${cleanPart.charAt(0).toUpperCase() + cleanPart.slice(1)}`;
        }).join('\n');
    }
}

// Global export for browser, ES modules, or Node environment
if (typeof window !== 'undefined') {
    window.WisprFlowFormatter = WisprFlowFormatter;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WisprFlowFormatter;
    module.exports.WisprFlowFormatter = WisprFlowFormatter;
    module.exports.default = WisprFlowFormatter;
}

export default WisprFlowFormatter;
export { WisprFlowFormatter };
