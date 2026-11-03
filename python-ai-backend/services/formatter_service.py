"""
Dictation Formatter Service
Provides AI-powered text formatting, filler word removal, and style transformations.
"""
import os
import re
import logging

logger = logging.getLogger(__name__)

class FormatterService:
    """Service for cleaning up dictated text and applying Wispr Flow styles"""

    ENGLISH_FILLERS = [
        r'\b(um+h*|uh+h*|er+h*|ah+h*|hmm+)\b',
        r'\b(you know|i mean|so yeah|kind of|sort of|basically|literally|actually)\b',
        r'\b(like)\b(?=\s+(?:i|we|you|it|they|he|she|the|a|an|that|this|what|how|why|is|was|were|so|and|to))'
    ]

    HINGLISH_FILLERS = [
        r'\b(matlab|yani|samjhe|kya kehte hain|matlab ki|bhai|so matlab)\b',
        r'\b(woh|wese|waise)\b(?=\s+(?:ki|hai|main|humein|aap|tum))'
    ]

    SPOKEN_PUNCTUATION = [
        (r'\s*\b(full stop|period)\b\s*', '. '),
        (r'\s*\b(comma)\b\s*', ', '),
        (r'\s*\b(question mark)\b\s*', '? '),
        (r'\s*\b(exclamation mark|exclamation point)\b\s*', '! '),
        (r'\s*\b(colon)\b\s*', ': '),
        (r'\s*\b(semicolon)\b\s*', '; '),
        (r'\s*\b(dash|hyphen)\b\s*', ' - '),
        (r'\s*\b(new line|next line|paragraph)\b\s*', '\n\n'),
        (r'\s*\b(bullet point|bullet)\b\s*', '\n• ')
    ]

    def __init__(self):
        logger.info("Initializing Formatter Service")

    def format_text(self, text, style='clean', language='en'):
        """
        Clean and format dictated text
        """
        if not text or not isinstance(text, str):
            return {'formatted_text': '', 'fillers_removed': 0}

        if style == 'raw':
            return {'formatted_text': text, 'fillers_removed': 0}

        processed = text
        
        # Count fillers before removal
        filler_matches = re.findall(r'\b(um|uh|er|ah|hmm|matlab|yani|basically|literally|you know)\b', processed, re.IGNORECASE)
        initial_filler_count = len(filler_matches)

        # 1. Filler Removal
        all_fillers = self.ENGLISH_FILLERS + self.HINGLISH_FILLERS
        for pattern in all_fillers:
            processed = re.sub(pattern, ' ', processed, flags=re.IGNORECASE)

        # 2. Remove Stutters / Duplicate Words
        processed = re.sub(r'\b(\w+)\s+\1\b', r'\1', processed, flags=re.IGNORECASE)

        remaining_fillers = len(re.findall(r'\b(um|uh|er|ah|hmm|matlab|yani|basically|literally|you know)\b', processed, re.IGNORECASE))
        fillers_removed = max(0, initial_filler_count - remaining_fillers)

        # 3. Spoken Punctuation
        for pattern, replacement in self.SPOKEN_PUNCTUATION:
            processed = re.sub(pattern, replacement, processed, flags=re.IGNORECASE)

        # 4. Clean spacing around punctuation
        processed = re.sub(r'[ \t]+', ' ', processed)
        processed = re.sub(r'\s+([.,?!:;])', r'\1', processed)
        processed = re.sub(r'([.,?!:;])([a-zA-Z])', r'\1 \2', processed)

        # 5. Apply Style Transformation
        if style == 'professional':
            processed = self._apply_professional_style(processed)
        elif style == 'bullet_points':
            processed = self._apply_bullet_points(processed)

        # 6. Sentence Capitalization
        processed = self._capitalize_sentences(processed)

        return {
            'formatted_text': processed.strip(),
            'fillers_removed': fillers_removed
        }

    def _capitalize_sentences(self, text):
        if not text:
            return ''
        
        # Capitalize isolated 'i'
        text = re.sub(r'\bi\b', 'I', text)
        
        # Capitalize beginning of sentences
        def cap_match(match):
            return match.group(0).upper()

        text = re.sub(r'(?:^|\n\n?|\. |\? |! |\u2022\s*)([a-z])', cap_match, text)
        
        if len(text) > 0:
            text = text[0].upper() + text[1:]
        return text

    def _apply_professional_style(self, text):
        text = text.strip()
        text = re.sub(r'^(hey|hi|hello|so|yeah|well)\s*,?\s*', '', text, flags=re.IGNORECASE)
        
        replacements = [
            (r'\bcan you\b', 'could you please'),
            (r'\bthanks a lot\b', 'thank you very much'),
            (r'\bgonna\b', 'going to'),
            (r'\bwanna\b', 'want to'),
            (r'\bgotta\b', 'need to'),
            (r'\basap\b', 'as soon as possible'),
            (r'\bby the way\b', 'incidentally'),
            (r'\blet me know\b', 'please inform me')
        ]
        
        for pattern, repl in replacements:
            text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
            
        if text and not re.search(r'[.?!:]$', text):
            text += '.'
        return text

    def _apply_bullet_points(self, text):
        parts = [p.strip() for p in re.split(r'(?:\n+|\. |\? |! )', text) if p.strip()]
        if not parts:
            return text
        if len(parts) == 1:
            return f"• {parts[0]}"
        return '\n'.join([f"• {re.sub(r'^[•\-\*\d+\.]\s*', '', p).capitalize()}" for p in parts])
