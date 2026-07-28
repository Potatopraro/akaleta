const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const pump = promisify(pipeline);

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.useOpenAI = Boolean(this.openaiApiKey);
    this.useGemini = Boolean(this.geminiApiKey);

    if (this.useOpenAI) {
      this.openaiClient = new OpenAI({ apiKey: this.openaiApiKey });
      console.log('[AIService] OpenAI client initialized');
    }

    if (this.useGemini) {
      this.geminiClient = new GoogleGenerativeAI(this.geminiApiKey);
      this.geminiModel = process.env.GEMINI_MODEL || 'gemini-1.0';
      console.log('[AIService] Gemini client initialized for model', this.geminiModel);
    }

    if (!this.useOpenAI && !this.useGemini) {
      console.warn('[AIService] No OpenAI or Gemini API key found. Chatbot will use fallback responses only.');
    }

    this.systemPrompt = `You are AKALETA, a friendly Nigerian Sign Language AI assistant. You help deaf and hard-of-hearing users. Keep responses short (1-2 sentences). Be encouraging and patient. Use simple English. You can respond to questions about: weather, time, news, general knowledge, jokes, and daily conversations.`;

    this.audioDir = path.join(__dirname, '../uploads/audio');
    fs.mkdirSync(this.audioDir, { recursive: true });
  }

  async chat(historyMessages) {
    const limitedHistory = historyMessages.slice(-5);

    if (this.useOpenAI) {
      try {
        const text = await this._openAIChat(limitedHistory);
        const audioUrl = await this._generateSpeech(text);
        return { text, audioUrl };
      } catch (err) {
        console.error('[AIService] OpenAI request failed:', err?.message || err, err);
        if (!this.useGemini) {
          console.warn('[AIService] No Gemini API key available, falling back to local response.');
        }
      }
    }

    if (this.useGemini) {
      try {
        const text = await this._geminiChat(limitedHistory);
        if (text) {
          return { text, audioUrl: null };
        }
      } catch (err) {
        console.error('[AIService] Gemini request failed:', err?.message || err, err);
      }
    }

    const fallback = this._fallbackResponse(historyMessages);
    console.warn('[AIService] Falling back to local response:', fallback);
    return { text: fallback, audioUrl: null };
  }

  async _openAIChat(messages) {
    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...messages.map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content
        }))
      ],
      max_tokens: 250,
      temperature: 0.7
    });

    return response.choices?.[0]?.message?.content?.trim() || '';
  }

  async _geminiChat(messages) {
    if (!this.geminiClient || messages.length === 0) {
      return '';
    }

    const userMessage = messages[messages.length - 1];
    const conversationHistory = messages.slice(0, -1).map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }]
    }));

    const chatSession = this.geminiClient
      .getGenerativeModel({
        model: this.geminiModel,
        systemInstruction: this.systemPrompt,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 250
        }
      })
      .startChat({ history: conversationHistory });

    const result = await chatSession.sendMessage(userMessage.content);
    const candidate = result?.response?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    return parts.map((part) => part?.text || '').join('').trim();
  }

  async _generateSpeech(text) {
    if (!this.useOpenAI || !text) return null;

    try {
      const speechStream = await this.openaiClient.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        input: text
      });

      const fileName = `akaleta-speech-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
      const filePath = path.join(this.audioDir, fileName);
      await pump(speechStream, fs.createWriteStream(filePath));
      return `/uploads/audio/${fileName}`;
    } catch (err) {
      console.error('[AIService] TTS generation failed:', err?.message || err, err);
      return null;
    }
  }

  _fallbackResponse(historyMessages) {
    const lastMessage = historyMessages[historyMessages.length - 1];
    if (!lastMessage) {
      return 'Hello! I am AKALETA, your NSL chatbot. How can I help you today?';
    }

    const text = String(lastMessage.content || '').toLowerCase();

    if (lastMessage.mode === 'sign') {
      if (text.includes('hello') || text.includes('hi')) {
        return 'Hello! I can help you with sign language and simple questions.';
      }
      if (text.includes('thank')) {
        return 'You’re welcome! Ask me another question if you like.';
      }
      if (text.includes('how are you')) {
        return 'I am okay, thank you. How can I assist you today?';
      }
      return 'I see your sign. Please try again or ask a simple question so I can respond better.';
    }

    if (text.includes('hello') || text.includes('hi')) {
      return 'Hello there! How can I assist you today?';
    }
    if (text.includes('thank')) {
      return 'You’re welcome! I am here to help.';
    }
    if (text.includes('how are you')) {
      return 'I am doing well. What would you like to know?';
    }
    if (text.includes('time')) {
      return 'I cannot check the exact time right now, but I am here to help with your questions.';
    }
    if (text.includes('weather')) {
      return 'I’m not able to fetch live weather at the moment, but I can answer other questions.';
    }

    return 'I’m sorry, I cannot generate a full answer right now. Please try again in a moment.';
  }
}

module.exports = new AIService();
