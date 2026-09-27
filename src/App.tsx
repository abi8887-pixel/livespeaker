import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRightLeft,
  Volume2,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Mic,
  MicOff,
  AlertCircle,
  Loader2,
  Languages,
  Info,
  Wand2,
} from 'lucide-react';
import { Header } from './components/Header';
import { StudioControls } from './components/StudioControls';
import { AudioPlayerDeck } from './components/AudioPlayerDeck';
import { PresetsModal } from './components/PresetsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { AudioClip, PresetPhrase } from './types';
import { PRESET_PHRASES } from './utils/presets';
import {
  base64ToArrayBuffer,
  pcmToAudioBuffer,
  decodeAudioPayload,
} from './utils/audioEncoder';

export default function App() {
  // Input states
  const [inputText, setInputText] = useState(
    'Hello, welcome to Karnataka! Would you like a cup of authentic filter coffee?'
  );
  const [isDirectKannada, setIsDirectKannada] = useState(false);
  const [kannadaText, setKannadaText] = useState(
    'ನಮಸ್ಕಾರ, ಕರ್ನಾಟಕಕ್ಕೆ ಸುಸ್ವಾಗತ! ನೀವು ಒಂದು ಕಪ್ ಅಪ್ಪಟ ಫಿಲ್ಟರ್ ಕಾಫಿ ಸವಿಯಲು ಇಷ್ಟಪಡುತ್ತೀರಾ?'
  );
  const [transliteration, setTransliteration] = useState(
    'Namaskara, Karnatakakke susvaagatha! Neevu ondu cup appata filter coffee saviyalu ishtapadutteera?'
  );
  const [literalMeaning, setLiteralMeaning] = useState(
    'Polite traditional greeting and warm hospitality offering local filter coffee.'
  );

  // Studio Voice Parameters
  const [selectedVoice, setSelectedVoice] = useState<'Kore' | 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr'>('Kore');
  const [tone, setTone] = useState<'natural' | 'formal' | 'warm' | 'storytelling'>('natural');
  const [pitch, setPitch] = useState<number>(0); // -12 to +12 semitones
  const [speed, setSpeed] = useState<number>(1.0); // 0.5x to 2.0x

  // Audio Buffers & Clips
  const [currentClip, setCurrentClip] = useState<AudioClip | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [history, setHistory] = useState<AudioClip[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslatingOnly, setIsTranslatingOnly] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedKannada, setCopiedKannada] = useState(false);

  // Web Speech recognition reference if supported
  const recognitionRef = useRef<any>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kalarava_audio_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 20));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (clip: AudioClip) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== clip.id);
      const updated = [clip, ...filtered].slice(0, 20);
      try {
        localStorage.setItem('kalarava_audio_history', JSON.stringify(updated));
      } catch {
        // ignore storage limits
      }
      return updated;
    });
  };

  // Convert raw base64 or container audio into AudioBuffer
  const processBase64Audio = async (base64: string, sampleRate = 24000) => {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const buffer = await decodeAudioPayload(base64, audioCtx, sampleRate);
    setAudioBuffer(buffer);
    return buffer;
  };

  // Main Speech Synthesis trigger (Unified translation + TTS)
  const handleGenerateAndSpeak = async (overrideText?: string) => {
    const textToProcess = overrideText !== undefined ? overrideText : inputText;
    if (!textToProcess.trim()) {
      setErrorMsg('Please enter English or Kannada text to synthesize.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/translate-and-speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToProcess.trim(),
          isKannadaInput: isDirectKannada,
          voiceName: selectedVoice,
          tone,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      setKannadaText(data.kannadaText);
      setTransliteration(data.transliteration || '');
      setLiteralMeaning(data.literalMeaning || '');

      const buffer = await processBase64Audio(data.audioBase64, data.sampleRate || 24000);

      const newClip: AudioClip = {
        id: `clip-${Date.now()}`,
        originalText: textToProcess.trim(),
        kannadaText: data.kannadaText,
        transliteration: data.transliteration,
        literalMeaning: data.literalMeaning,
        voiceName: data.voiceName || selectedVoice,
        tone,
        pitch,
        speed,
        sampleRate: data.sampleRate || 24000,
        duration: buffer.duration,
        audioBase64: data.audioBase64,
        mimeType: data.mimeType || 'audio/pcm;rate=24000',
        createdAt: Date.now(),
      };

      setCurrentClip(newClip);
      saveToHistory(newClip);
    } catch (err: unknown) {
      console.error('Speech synthesis error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error during synthesis';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Translate Only (preview Kannada text & transliteration before generating speech)
  const handleTranslateOnly = async () => {
    if (!inputText.trim()) return;
    setIsTranslatingOnly(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText.trim(), tone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Translation failed' }));
        throw new Error(data.error || 'Translation failed');
      }

      const data = await res.json();
      setKannadaText(data.kannadaText);
      setTransliteration(data.transliteration);
      setLiteralMeaning(data.literalMeaning || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Translation error';
      setErrorMsg(msg);
    } finally {
      setIsTranslatingOnly(false);
    }
  };

  // Synthesize existing Kannada text directly
  const handleSynthesizeKannadaOnly = async () => {
    if (!kannadaText.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: kannadaText.trim(),
          voiceName: selectedVoice,
          style: `${tone} natural Kannada spoken pronunciation with authentic cadence`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Synthesis failed' }));
        throw new Error(data.error || 'Synthesis failed');
      }

      const data = await res.json();
      const buffer = await processBase64Audio(data.audioBase64, data.sampleRate || 24000);

      const newClip: AudioClip = {
        id: `clip-${Date.now()}`,
        originalText: inputText.trim() || kannadaText.trim(),
        kannadaText: kannadaText.trim(),
        transliteration,
        literalMeaning,
        voiceName: data.voiceName || selectedVoice,
        tone,
        pitch,
        speed,
        sampleRate: data.sampleRate || 24000,
        duration: buffer.duration,
        audioBase64: data.audioBase64,
        mimeType: data.mimeType || 'audio/pcm;rate=24000',
        createdAt: Date.now(),
      };

      setCurrentClip(newClip);
      saveToHistory(newClip);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Synthesis error';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Load a clip from history back into the studio deck
  const handleSelectHistoryClip = async (clip: AudioClip) => {
    setCurrentClip(clip);
    setInputText(clip.originalText);
    setKannadaText(clip.kannadaText);
    setTransliteration(clip.transliteration);
    if (clip.literalMeaning) setLiteralMeaning(clip.literalMeaning);
    setSelectedVoice(clip.voiceName);
    setTone(clip.tone);
    setPitch(clip.pitch);
    setSpeed(clip.speed);
    await processBase64Audio(clip.audioBase64, clip.sampleRate);
  };

  // Keyboard shortcut Ctrl/Cmd + Enter to trigger generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading) {
          handleGenerateAndSpeak();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputText, isDirectKannada, selectedVoice, tone, pitch, speed, isLoading]);

  // Voice dictation using browser SpeechRecognition (if available)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition is not supported in this browser window.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = isDirectKannada ? 'kn-IN' : 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMsg(null);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (isDirectKannada) {
            setKannadaText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          } else {
            setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
          setIsListening(false);
        };

        recognition.onerror = (e: any) => {
          console.error('Speech recognition error:', e);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Dictation error:', err);
        setIsListening(false);
      }
    }
  };

  const handleCopyKannada = async () => {
    await navigator.clipboard.writeText(kannadaText);
    setCopiedKannada(true);
    setTimeout(() => setCopiedKannada(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Studio Header */}
      <Header
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
      />

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Notification Banner if any */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start justify-between gap-3 text-red-300 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold block text-red-200">Processing Error</span>
                {errorMsg}
              </div>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-200 text-xs px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Translation & Text Input Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: English Input */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-amber-400" />
                  <span className="text-xs uppercase font-semibold tracking-wider text-slate-300">
                    {isDirectKannada ? 'Direct Kannada Script' : 'English Text Input'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDirectKannada(!isDirectKannada)}
                    className="text-xs text-amber-400/90 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{isDirectKannada ? 'Switch to English' : 'Direct Kannada Mode'}</span>
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative mt-3">
                <textarea
                  rows={4}
                  value={isDirectKannada ? kannadaText : inputText}
                  onChange={(e) => {
                    if (isDirectKannada) {
                      setKannadaText(e.target.value);
                    } else {
                      setInputText(e.target.value);
                    }
                  }}
                  placeholder={
                    isDirectKannada
                      ? 'ಇಲ್ಲಿ ಕನ್ನಡದಲ್ಲಿ ಪಠ್ಯವನ್ನು ಬರೆಯಿರಿ (Type or paste Kannada text here)...'
                      : 'Type or paste English sentence here (e.g., "Hello, how are you today?")...'
                  }
                  className={`w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-all resize-y ${
                    isDirectKannada ? 'font-kannada text-base' : ''
                  }`}
                />
              </div>

              {/* Action bar under textarea */}
              <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                      isListening
                        ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                    title="Voice dictation through microphone"
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3 h-3 text-red-400" />
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3 text-amber-400" />
                        <span>Voice Mic</span>
                      </>
                    )}
                  </button>

                  {!isDirectKannada && (
                    <button
                      type="button"
                      disabled={isTranslatingOnly || !inputText.trim()}
                      onClick={handleTranslateOnly}
                      className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-800 bg-slate-950 text-slate-300 hover:text-amber-300 hover:border-slate-700 transition-colors disabled:opacity-40"
                      title="Translate only without generating audio yet"
                    >
                      {isTranslatingOnly ? (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                      ) : (
                        <Wand2 className="w-3 h-3 text-amber-400" />
                      )}
                      <span>Translate Only</span>
                    </button>
                  )}
                </div>

                <span className="font-mono-num text-[11px]">
                  {(isDirectKannada ? kannadaText : inputText).length} characters
                </span>
              </div>
            </div>

            {/* Quick Sample Presets Bar */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Quick Everyday Kannada Presets
                </span>
                <button
                  type="button"
                  onClick={() => setIsPresetsOpen(true)}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PHRASES.slice(0, 3).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(p.english);
                      if (p.kannadaHint) setKannadaText(p.kannadaHint);
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-white transition-colors truncate max-w-[280px]"
                    title={p.english}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Kannada Translation & Phonetics Preview */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-kannada font-bold text-amber-400 text-base">ಕ</span>
                  <span className="text-xs uppercase font-semibold tracking-wider text-slate-300">
                    Kannada Script & Pronunciation
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyKannada}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
                    title="Copy Kannada script"
                  >
                    {copiedKannada ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKannada ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Kannada Script Box */}
              <div className="mt-3 p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 min-h-[90px] flex items-center">
                <p className="font-kannada text-lg sm:text-xl text-amber-300 font-medium leading-relaxed">
                  {kannadaText || (
                    <span className="text-slate-600 font-sans text-sm italic">
                      Kannada translation will appear here...
                    </span>
                  )}
                </p>
              </div>

              {/* English Phonetic Transliteration */}
              <div className="mt-3 p-3.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  <Info className="w-3 h-3 text-amber-400" />
                  <span>Phonetic Guide (English Spoken Pronunciation)</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 italic font-medium leading-relaxed">
                  {transliteration || (
                    <span className="text-slate-600 not-italic text-xs">
                      Phonetic breakdown will appear after translation...
                    </span>
                  )}
                </p>
              </div>

              {/* Cultural / Meaning nuance if present */}
              {literalMeaning && (
                <div className="mt-2 text-[11px] text-slate-400 px-1 flex items-center gap-1.5">
                  <span className="text-amber-500/80 font-bold">Context:</span>
                  <span>{literalMeaning}</span>
                </div>
              )}
            </div>

            {/* Synthesize Button Banner */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Shortcuts: <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono-num">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono-num">Enter</kbd>
              </span>

              <button
                type="button"
                disabled={isLoading || (!inputText.trim() && !kannadaText.trim())}
                onClick={() => {
                  if (isDirectKannada) {
                    handleSynthesizeKannadaOnly();
                  } else {
                    handleGenerateAndSpeak();
                  }
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Synthesizing Studio Audio...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>Translate & Speak Kannada</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Studio Controls: Voice, Tone, Pitch, Speed */}
        <StudioControls
          selectedVoice={selectedVoice}
          onSelectVoice={setSelectedVoice}
          tone={tone}
          onChangeTone={setTone}
          pitch={pitch}
          onChangePitch={setPitch}
          speed={speed}
          onChangeSpeed={setSpeed}
        />

        {/* Audio Player & Export / Share Deck */}
        <AudioPlayerDeck
          currentClip={currentClip}
          audioBuffer={audioBuffer}
          pitch={pitch}
          speed={speed}
          onPitchChange={setPitch}
          onSpeedChange={setSpeed}
        />
      </main>

      {/* Preset Phrases Modal */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPhrase={(p: PresetPhrase) => {
          setInputText(p.english);
          if (p.kannadaHint) setKannadaText(p.kannadaHint);
          setIsDirectKannada(false);
        }}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        clips={history}
        onSelectClip={handleSelectHistoryClip}
        onDeleteClip={(id: string) => {
          setHistory((prev) => {
            const updated = prev.filter((c) => c.id !== id);
            localStorage.setItem('kalarava_audio_history', JSON.stringify(updated));
            return updated;
          });
        }}
        onClearAll={() => {
          setHistory([]);
          localStorage.removeItem('kalarava_audio_history');
        }}
      />
    </div>
  );
}
