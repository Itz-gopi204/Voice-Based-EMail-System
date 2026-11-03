/**
 * AI Controller
 * Handles AI/NLP operations via Python backend
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import translate from 'translate-google';

const AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000';

/**
 * Process text translation
 */
export const translateText = async (req, res) => {
  try {
    const { text, targetLang = 'en', sourceLang = 'auto' } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Missing text',
        message: 'Please provide text to translate',
      });
    }

    const translatedText = await translate(text, { from: sourceLang, to: targetLang });
    
    logger.info(`Translation processed successfuly`);

    res.json({
      success: true,
      translatedText,
      originalText: text,
      targetLanguage: targetLang
    });
  } catch (error) {
    logger.error('Translation error:', error);
    res.status(500).json({
      error: 'Translation failed',
      message: error.message,
    });
  }
};

/**
 * Process speech-to-text
 */
export const processSpeechToText = async (req, res) => {
  try {
    const { audio, language = 'en-US' } = req.body;

    const response = await axios.post(`${AI_SERVICE_URL}/api/speech-to-text`, {
      audio,
      language,
    }, {
      timeout: 30000, // 30 second timeout for AI processing
    });

    logger.info(`Speech-to-text processed for ${req.session.userEmail}`);

    res.json({
      success: true,
      text: response.data.text,
      confidence: response.data.confidence,
      language: response.data.language,
    });
  } catch (error) {
    logger.error('Speech-to-text error:', error);
    res.status(500).json({
      error: 'Speech-to-text failed',
      message: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Process text-to-speech
 */
export const processTextToSpeech = async (req, res) => {
  try {
    const { text, language = 'en-US', voice = 'default' } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required',
      });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/api/text-to-speech`, {
      text,
      language,
      voice,
    }, {
      timeout: 30000,
      responseType: 'arraybuffer',
    });

    logger.info(`Text-to-speech processed for ${req.session.userEmail}`);

    // Return audio file
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': response.data.length,
    });
    res.send(response.data);
  } catch (error) {
    logger.error('Text-to-speech error:', error);
    res.status(500).json({
      error: 'Text-to-speech failed',
      message: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Process voice command with intent classification
 */
export const processVoiceCommand = async (req, res) => {
  try {
    const { audio, text, language = 'en-US' } = req.body;

    // If audio is provided, convert to text first
    let commandText = text;
    if (audio && !text) {
      const sttResponse = await axios.post(`${AI_SERVICE_URL}/api/speech-to-text`, {
        audio,
        language,
      }, { timeout: 30000 });
      commandText = sttResponse.data.text;
    }

    if (!commandText) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either audio or text must be provided',
      });
    }

    // Classify intent
    const response = await axios.post(`${AI_SERVICE_URL}/api/classify-intent`, {
      text: commandText,
      language,
    }, { timeout: 10000 });

    logger.info(`Voice command processed: "${commandText}" for ${req.session.userEmail}`);

    res.json({
      success: true,
      text: commandText,
      intent: response.data.intent,
      confidence: response.data.confidence,
      entities: response.data.entities || {},
    });
  } catch (error) {
    logger.error('Voice command processing error:', error);
    res.status(500).json({
      error: 'Voice command processing failed',
      message: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Detect spam in email
 */
export const detectSpam = async (req, res) => {
  try {
    const { subject, body, from } = req.body;

    if (!subject && !body) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either subject or body must be provided',
      });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/api/spam-detection`, {
      subject,
      body,
      from,
    }, { timeout: 10000 });

    logger.info(`Spam detection performed for ${req.session.userEmail}`);

    res.json({
      success: true,
      isSpam: response.data.is_spam,
      confidence: response.data.confidence,
      reason: response.data.reason,
    });
  } catch (error) {
    logger.error('Spam detection error:', error);
    res.status(500).json({
      error: 'Spam detection failed',
      message: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Classify intent from text
 */
export const classifyIntent = async (req, res) => {
  try {
    const { text, language = 'en-US' } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Text is required',
      });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/api/classify-intent`, {
      text,
      language,
    }, { timeout: 10000 });

    logger.info(`Intent classified for ${req.session.userEmail}`);

    res.json({
      success: true,
      intent: response.data.intent,
      confidence: response.data.confidence,
      entities: response.data.entities || {},
    });
  } catch (error) {
    logger.error('Intent classification error:', error);
    res.status(500).json({
      error: 'Intent classification failed',
      message: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Groq LLM Natural Speech Understanding Endpoint
 */
export const processGroqNLU = async (req, res) => {
  try {
    const { text, context } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;

    if (groqApiKey) {
      const systemPrompt = `You are AuraMail AI, an accessible voice email assistant for visually impaired users.
Analyze the user's spoken input and determine their intent.
Return ONLY a JSON object with this exact schema:
{
  "action": "read_inbox" | "compose_email" | "switch_folder" | "search_emails" | "summarize_email" | "start_dictating" | "stop_dictating" | "general_chat",
  "folder": "inbox" | "sent" | "drafts" | "spam" | "trash",
  "to": string or null,
  "subject": string or null,
  "body": string or null,
  "query": string or null,
  "speak": "Warm, natural spoken response to be read aloud to the user"
}`;

      const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User spoken input: "${text}". Current screen context: "${context || 'inbox'}"` }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }, {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const parsed = JSON.parse(groqRes.data.choices[0].message.content);
      return res.json({ success: true, ...parsed });
    }

    // Smart Fallback NLU if GROQ_API_KEY is not set
    const lower = text.toLowerCase().trim();
    let action = 'general_chat';
    let speak = `I heard: "${text}". How can I help with your emails?`;
    let folder = null;
    let to = null;
    let subject = null;
    let body = null;
    let query = null;

    if (lower.match(/read|check|show|inbox|emails?/i) && !lower.includes('write') && !lower.includes('send')) {
      action = 'read_inbox';
      speak = 'Opening your inbox to read your latest emails.';
    } else if (lower.match(/compose|write|send|create|new email/i)) {
      action = 'compose_email';
      speak = 'Opening the compose screen for you.';
      
      const emailMatch = lower.match(/(?:to|recipient)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (emailMatch) to = emailMatch[1];

      const subjectMatch = lower.match(/subject\s+(?:is|about)?\s+(.+?)(?:message|body|$)/i);
      if (subjectMatch) subject = subjectMatch[1].trim();

      const bodyMatch = lower.match(/(?:message|body|saying)\s+(.+)$/i);
      if (bodyMatch) body = bodyMatch[1].trim();
    } else if (lower.includes('sent')) {
      action = 'switch_folder';
      folder = 'sent';
      speak = 'Switching to your sent folder.';
    } else if (lower.includes('draft')) {
      action = 'switch_folder';
      folder = 'drafts';
      speak = 'Switching to your drafts folder.';
    } else if (lower.includes('spam')) {
      action = 'switch_folder';
      folder = 'spam';
      speak = 'Switching to your spam folder.';
    } else if (lower.match(/search|find|look for/i)) {
      action = 'search_emails';
      query = lower.replace(/search|find|look for|emails?|about/gi, '').trim();
      speak = `Searching your emails for ${query}.`;
    } else if (lower.match(/summarize|summary/i)) {
      action = 'summarize_email';
      speak = 'Summarizing the email for you.';
    }

    return res.json({
      success: true,
      action,
      folder,
      to,
      subject,
      body,
      query,
      speak
    });

  } catch (err) {
    logger.error('Groq NLU error:', err);
    return res.status(500).json({ error: 'NLU processing failed', message: err.message });
  }
};

export default {
  processSpeechToText,
  processTextToSpeech,
  processVoiceCommand,
  detectSpam,
  classifyIntent,
  processGroqNLU
};
