import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client utility
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to call Gemini with retry and fallback on transient 503/429 errors
async function generateContentWithRetry(params: any, fallbackModel?: string) {
  let attempts = 0;
  const maxAttempts = 3;
  let currentParams = { ...params };

  while (attempts < maxAttempts) {
    try {
      return await ai.models.generateContent(currentParams);
    } catch (err: any) {
      attempts++;
      const isTransient =
        err?.status === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempts < maxAttempts) {
        console.warn(`Transient error on ${currentParams.model} (attempt ${attempts}/${maxAttempts}), retrying in 800ms...`);
        await new Promise((r) => setTimeout(r, 800 * attempts));
        // If 2 attempts failed and fallbackModel is provided, switch model
        if (attempts === 2 && fallbackModel) {
          console.warn(`Switching to fallback model: ${fallbackModel}`);
          currentParams.model = fallbackModel;
        }
      } else {
        throw err;
      }
    }
  }
  throw new Error('All retry attempts failed');
}

/**
 * Endpoint to translate English to Kannada with transliteration & linguistic context
 */
app.post('/api/translate', async (req, res) => {
  try {
    const { text, tone = 'natural' } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text prompt is required' });
      return;
    }

    if (!apiKey) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the server environment.',
      });
      return;
    }

    const toneInstructions: Record<string, string> = {
      natural: 'Authentic everyday colloquial and polite Kannada spoken in Karnataka (e.g. Bengaluru, Mysuru).',
      formal: 'High-register, professional, grammatically pristine Kannada suitable for announcements, news, or presentations.',
      warm: 'Affectionate, gentle, polite, and cordial Kannada tone with warmth.',
      storytelling: 'Expressive, rhythmic, dynamic, and narrative Kannada tone with vivid emotional cadence.',
    };

    const toneGuide = toneInstructions[tone] || toneInstructions.natural;

    const prompt = `You are an expert English to Kannada translator and phonetic linguist.
Translate the following English text into authentic, natural, high-fidelity Kannada.
Source English Text:
"""${text.trim()}"""

Tone required: ${toneGuide}

Respond strictly in JSON matching the schema provided:
- kannadaText: Clean, authentic Kannada script translation (ಕನ್ನಡ ಅಕ್ಷರಗಳಲ್ಲಿ).
- transliteration: Accurate English phonetic transliteration (e.g., "Namaskara, neevu hegiddeera?") so an English speaker can pronounce it accurately.
- literalMeaning: Brief explanation of the translation nuance.
- audioSpeechStyle: Recommended speech style guidance for TTS delivery (e.g., "Warm and welcoming with natural cadence").`;

    const response = await generateContentWithRetry({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            kannadaText: {
              type: Type.STRING,
              description: 'The Kannada script translation',
            },
            transliteration: {
              type: Type.STRING,
              description: 'English phonetic transliteration of the Kannada phrase',
            },
            literalMeaning: {
              type: Type.STRING,
              description: 'Brief linguistic note or literal meaning',
            },
            audioSpeechStyle: {
              type: Type.STRING,
              description: 'Voice style guidance for speech synthesis',
            },
          },
          required: ['kannadaText', 'transliteration', 'audioSpeechStyle'],
        },
      },
    }, 'gemini-3.1-flash-lite');

    const outputText = response.text || '{}';
    const parsed = JSON.parse(outputText);
    res.json({
      success: true,
      originalText: text,
      ...parsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown translation error';
    console.error('Translation error:', error);
    res.status(500).json({ error: message });
  }
});

/**
 * Endpoint to synthesize text to speech using Gemini TTS (gemini-3.8-flash-lite-tts)
 * Returns high-quality 24kHz raw PCM data encoded in base64.
 */
app.post('/api/synthesize', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      style = 'Warm, natural Kannada pronunciation with clear diction',
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text is required for speech synthesis' });
      return;
    }

    if (!apiKey) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the server environment.',
      });
      return;
    }

    // Supported prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const validVoices = ['Kore', 'Puck', 'Fenrir', 'Charon', 'Zephyr'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    const response = await generateContentWithRetry({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: style || 'Clear, natural Kannada spoken articulation with proper intonation',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    }, 'gemini-3.8-flash-tts');

    const candidatePart = response.candidates?.[0]?.content?.parts?.[0];
    const base64Audio = candidatePart?.inlineData?.data;
    const mimeType = candidatePart?.inlineData?.mimeType || 'audio/pcm;rate=24000';

    if (!base64Audio) {
      res.status(502).json({
        error: 'The speech synthesis model did not return audio data.',
      });
      return;
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType,
      sampleRate: 24000,
      voiceName: chosenVoice,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown synthesis error';
    console.error('Speech synthesis error:', error);
    res.status(500).json({ error: message });
  }
});

/**
 * Unified pipeline: Translate English to Kannada + Synthesize TTS in one high-performance call
 */
app.post('/api/translate-and-speak', async (req, res) => {
  try {
    const {
      text,
      isKannadaInput = false,
      voiceName = 'Kore',
      tone = 'natural',
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text prompt is required' });
      return;
    }

    if (!apiKey) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the server environment.',
      });
      return;
    }

    let kannadaText = text.trim();
    let transliteration = '';
    let literalMeaning = '';
    let speechStyle = 'Warm, natural Kannada pronunciation with clear articulation';

    if (!isKannadaInput) {
      const toneMap: Record<string, string> = {
        natural: 'Authentic everyday polite Kannada spoken in Karnataka.',
        formal: 'High-register, professional, clear formal Kannada.',
        warm: 'Gentle, polite, welcoming Kannada tone.',
        storytelling: 'Expressive narrative storytelling cadence in Kannada.',
      };

      const toneGuide = toneMap[tone] || toneMap.natural;

      const translationPrompt = `Translate this English text into natural, idiomatic Kannada:
"${text.trim()}"

Tone: ${toneGuide}

Respond strictly in JSON matching the schema:
- kannadaText: Kannada script translation
- transliteration: English phonetic pronunciation guide
- literalMeaning: Brief meaning note
- audioSpeechStyle: Tone instruction for speech synthesis in English`;

      const transRes = await generateContentWithRetry({
        model: 'gemini-3.8-flash',
        contents: translationPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              kannadaText: { type: Type.STRING },
              transliteration: { type: Type.STRING },
              literalMeaning: { type: Type.STRING },
              audioSpeechStyle: { type: Type.STRING },
            },
            required: ['kannadaText', 'transliteration', 'audioSpeechStyle'],
          },
        },
      }, 'gemini-3.1-flash-lite');

      const parsed = JSON.parse(transRes.text || '{}');
      kannadaText = parsed.kannadaText || text.trim();
      transliteration = parsed.transliteration || '';
      literalMeaning = parsed.literalMeaning || '';
      speechStyle = parsed.audioSpeechStyle || speechStyle;
    } else {
      transliteration = 'Direct Kannada input';
    }

    // Supported prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const validVoices = ['Kore', 'Puck', 'Fenrir', 'Charon', 'Zephyr'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    const ttsResponse = await generateContentWithRetry({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: kannadaText,
              speechMetadata: {
                style: speechStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    }, 'gemini-3.8-flash-tts');

    const candidatePart = ttsResponse.candidates?.[0]?.content?.parts?.[0];
    const base64Audio = candidatePart?.inlineData?.data;
    const mimeType = candidatePart?.inlineData?.mimeType || 'audio/pcm;rate=24000';

    if (!base64Audio) {
      res.status(502).json({
        error: 'Failed to synthesize speech audio from model.',
      });
      return;
    }

    res.json({
      success: true,
      originalText: text,
      kannadaText,
      transliteration,
      literalMeaning,
      audioBase64: base64Audio,
      mimeType,
      sampleRate: 24000,
      voiceName: chosenVoice,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Processing failed';
    console.error('Unified speech error:', error);
    res.status(500).json({ error: message });
  }
});

// Production static file serving or Dev Vite Middleware setup
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
