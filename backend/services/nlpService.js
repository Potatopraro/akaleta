const axios = require('axios');

class NLPService {
  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.systemPrompt = `You are AKALETA, a knowledgeable and friendly Nigerian Sign Language (NSL) assistant. 
Your role is to:
1. Help users learn Nigerian Sign Language
2. Explain signs, their meanings, and cultural context
3. Provide information about deaf communities in Nigeria
4. Assist with translation between spoken Nigerian languages and NSL
5. Offer encouragement and learning tips

You are warm, culturally aware of Nigerian context, and knowledgeable about:
- The 137 NSL signs in the AKALETA system
- Nigerian deaf community culture and etiquette
- Differences between NSL and other sign languages (ASL, BSL)
- Common Nigerian phrases and their NSL equivalents

Keep responses concise, helpful, and encouraging. When a user signs something (sign chat mode), 
acknowledge the sign they made and respond appropriately.`;
  }

  /**
   * Main chat function - uses OpenAI if key is available, else rule-based fallback
   */
  async chat(conversationHistory, currentMessage) {
    if (this.openaiKey && this.openaiKey !== 'your_openai_api_key_here') {
      try {
        return await this._openAIChat(conversationHistory, currentMessage);
      } catch (err) {
        console.warn('[NLP] OpenAI failed, using fallback:', err.message);
      }
    }
    return this._ruleBasedResponse(currentMessage);
  }

  /**
   * OpenAI GPT-4 integration
   */
  async _openAIChat(history, message) {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...history.slice(-10), // Last 10 messages for context
      { role: 'user', content: message }
    ];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * Rule-based fallback when no API key is configured
   */
  _ruleBasedResponse(message) {
    const msg = message.toLowerCase().trim();

    // Sign-specific responses
    const signResponses = {
      'hello': 'Great job! "Hello" in Nigerian Sign Language is made by waving your open hand. Keep practicing! 👋',
      'thank you': 'Excellent! "Thank you" is an important sign. In NSL, you touch your lips then extend your hand forward. Very polite!',
      'yes': 'Well done! "Yes" in NSL involves a nodding fist motion. Simple but essential!',
      'no': 'Good practice! "No" involves shaking two fingers together. Very clear and universal.',
      'help': '"Help" in NSL — you\'re asking for support! The sign involves lifting your fist with your other hand.',
      'water': 'Great! "Water" in NSL involves the letter W near your mouth. Stay hydrated! 💧',
      'food': '"Food" — essential! The sign involves bringing your hand to your mouth repeatedly.',
      'family': 'Wonderful! "Family" in NSL circles both F-handshapes around each other.',
    };

    // Check if message matches a known sign
    for (const [sign, response] of Object.entries(signResponses)) {
      if (msg.includes(sign)) return response;
    }

    // General conversational responses
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    if (greetings.some(g => msg.includes(g))) {
      return 'Hello! Welcome to AKALETA. I\'m here to help you learn Nigerian Sign Language. You can ask me about specific signs, practice with the webcam, or learn about NSL culture. What would you like to explore today? 🤟';
    }

    if (msg.includes('how') && msg.includes('sign')) {
      return 'To learn how to sign something, you can use the Translator mode to practice with your webcam! I can also describe signs — just tell me which word or phrase you\'d like to sign.';
    }

    if (msg.includes('learn') || msg.includes('practice')) {
      return 'Great enthusiasm! The best way to learn NSL is through consistent practice. I recommend: 1) Start with the alphabet, 2) Practice common greetings daily, 3) Use the Translator to get real-time feedback on your signs. Which category would you like to start with?';
    }

    if (msg.includes('nigeria') || msg.includes('nsl') || msg.includes('deaf')) {
      return 'Nigerian Sign Language (NSL) is a rich visual language used by Nigeria\'s deaf community. It developed organically within deaf schools and communities, and has regional variations across states. AKALETA\'s system covers 137 common signs used throughout Nigeria.';
    }

    if (msg.includes('alphabet') || msg.includes('letter')) {
      return 'NSL has its own fingerspelling alphabet! It differs from ASL. The AKALETA system supports all 26 letters. Try going to the Translator and fingerspelling your name — the system will detect each letter!';
    }

    if (msg.includes('thank')) {
      return 'You\'re welcome! Keep practicing your NSL signs. Remember: consistency is key. Even 10 minutes of daily practice makes a big difference! 🌟';
    }

    // Default helpful response
    const defaults = [
      'That\'s interesting! Could you tell me more? I can help you with NSL signs, translation, or learning tips.',
      'I\'m here to help with Nigerian Sign Language. You can ask me about specific signs, or use the Translator to practice with your camera!',
      'Great question! For the best NSL learning experience, try combining text chat with the Sign Chat mode where you practice with your webcam.',
      'As your AKALETA assistant, I can help you understand NSL signs, their meanings, and cultural context. What would you like to know?'
    ];

    return defaults[Math.floor(Math.random() * defaults.length)];
  }
}

module.exports = new NLPService();
