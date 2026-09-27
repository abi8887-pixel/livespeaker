import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  Download,
  Share2,
  Check,
  FileAudio,
  Sparkles,
  Loader2,
  FastForward,
  Rewind,
  Copy,
} from 'lucide-react';
import { WaveformVisualizer } from './WaveformVisualizer';
import { AudioClip } from '../types';
import {
  renderProcessedAudioBuffer,
  audioBufferToWavBlob,
  audioBufferToMp3Blob,
  audioBufferToAacBlob,
  extractWaveformData,
} from '../utils/audioEncoder';

interface AudioPlayerDeckProps {
  currentClip: AudioClip | null;
  audioBuffer: AudioBuffer | null;
  pitch: number;
  speed: number;
  onPitchChange: (val: number) => void;
  onSpeedChange: (val: number) => void;
}

export const AudioPlayerDeck: React.FC<AudioPlayerDeckProps> = ({
  currentClip,
  audioBuffer,
  pitch,
  speed,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  // Web Audio Context & Active Source Node references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Initialize or update waveform when audioBuffer changes
  useEffect(() => {
    if (!audioBuffer) {
      setDuration(0);
      setCurrentTime(0);
      setWaveformPeaks([]);
      stopPlayback();
      return;
    }

    // Effective duration scales with speed
    const effectiveDur = audioBuffer.duration / Math.max(0.2, speed);
    setDuration(effectiveDur);
    setCurrentTime(0);
    startOffsetRef.current = 0;

    // Extract visual waveform peaks
    const peaks = extractWaveformData(audioBuffer, 64);
    setWaveformPeaks(peaks);

    return () => {
      stopPlayback();
    };
  }, [audioBuffer]);

  // Adjust live pitch & speed while playing
  useEffect(() => {
    if (sourceNodeRef.current && audioCtxRef.current) {
      sourceNodeRef.current.playbackRate.value = Math.max(0.25, Math.min(3.0, speed));
      sourceNodeRef.current.detune.value = pitch * 100;
    }
    if (audioBuffer) {
      setDuration(audioBuffer.duration / Math.max(0.25, speed));
    }
  }, [pitch, speed, audioBuffer]);

  // Adjust live volume
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Stop playback cleanly
  const stopPlayback = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore already stopped
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  // Start or resume audio playback at offset
  const playAudio = (offset = 0) => {
    if (!audioBuffer) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    stopPlayback();

    const gainNode = ctx.createGain();
    gainNode.gain.value = isMuted ? 0 : volume;
    gainNode.connect(ctx.destination);
    gainNodeRef.current = gainNode;

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = Math.max(0.25, Math.min(3.0, speed));
    source.detune.value = pitch * 100;
    source.loop = isLooping;
    source.connect(gainNode);

    // Bound offset
    const maxOffset = audioBuffer.duration;
    const safeOffset = Math.max(0, Math.min(maxOffset - 0.05, offset));

    source.start(0, safeOffset);
    sourceNodeRef.current = source;
    startTimeRef.current = ctx.currentTime;
    startOffsetRef.current = safeOffset;
    setIsPlaying(true);

    // Track playback progress
    const updateProgress = () => {
      if (!audioCtxRef.current || !sourceNodeRef.current) return;
      const elapsedBufferTime = (audioCtxRef.current.currentTime - startTimeRef.current) * speed;
      const currentPos = startOffsetRef.current + elapsedBufferTime;

      if (currentPos >= audioBuffer.duration) {
        if (isLooping) {
          startTimeRef.current = audioCtxRef.current.currentTime;
          startOffsetRef.current = 0;
          setCurrentTime(0);
          animFrameRef.current = requestAnimationFrame(updateProgress);
        } else {
          stopPlayback();
          setCurrentTime(duration);
        }
      } else {
        // Scale to displayed duration
        setCurrentTime(currentPos / speed);
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);

    source.onended = () => {
      if (!isLooping) {
        stopPlayback();
      }
    };
  };

  const togglePlay = () => {
    if (!audioBuffer) return;
    if (isPlaying) {
      // Pause: save position
      if (audioCtxRef.current) {
        const elapsed = (audioCtxRef.current.currentTime - startTimeRef.current) * speed;
        startOffsetRef.current += elapsed;
      }
      stopPlayback();
    } else {
      if (currentTime >= duration - 0.05) {
        startOffsetRef.current = 0;
        setCurrentTime(0);
      }
      playAudio(startOffsetRef.current);
    }
  };

  const handleSeek = (percentage: number) => {
    if (!audioBuffer) return;
    const targetBufferTime = percentage * audioBuffer.duration;
    startOffsetRef.current = targetBufferTime;
    setCurrentTime(percentage * duration);
    if (isPlaying) {
      playAudio(targetBufferTime);
    }
  };

  const skipSeconds = (seconds: number) => {
    if (!audioBuffer) return;
    const currentBufferPos = (currentTime * speed) + (seconds * speed);
    const safeBufferPos = Math.max(0, Math.min(audioBuffer.duration - 0.1, currentBufferPos));
    startOffsetRef.current = safeBufferPos;
    setCurrentTime(safeBufferPos / speed);
    if (isPlaying) {
      playAudio(safeBufferPos);
    }
  };

  // Keyboard shortcut for Play/Pause (Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in textarea or input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, audioBuffer, duration, currentTime, speed]);

  // Export audio rendered with current Pitch & Speed
  const handleExport = async (format: 'mp3' | 'wav' | 'aac') => {
    if (!audioBuffer || !currentClip) return;
    try {
      setIsExporting(format);

      // Render audio with pitch and speed applied
      const processedBuffer = await renderProcessedAudioBuffer(audioBuffer, pitch, speed);

      let blob: Blob;
      let filename = `kalarava-kannada-${Date.now()}.${format}`;

      if (format === 'wav') {
        blob = audioBufferToWavBlob(processedBuffer);
      } else if (format === 'mp3') {
        blob = audioBufferToMp3Blob(processedBuffer, 192);
      } else {
        blob = await audioBufferToAacBlob(processedBuffer);
      }

      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(null);
    }
  };

  // Share audio via Web Share API or download fallback
  const handleShare = async () => {
    if (!audioBuffer || !currentClip) return;

    try {
      setIsExporting('share');
      // Render MP3 file with current pitch and speed
      const processedBuffer = await renderProcessedAudioBuffer(audioBuffer, pitch, speed);
      const mp3Blob = audioBufferToMp3Blob(processedBuffer, 192);
      const filename = `kalarava-kannada-${Date.now()}.mp3`;
      const file = new File([mp3Blob], filename, { type: 'audio/mp3' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Kannada Voice Speech - Kalarava',
          text: `Kannada: "${currentClip.kannadaText}" (${currentClip.transliteration})`,
          files: [file],
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } else {
        // Fallback: download MP3 & copy transliteration to clipboard
        const url = URL.createObjectURL(mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        await navigator.clipboard.writeText(
          `Kannada: ${currentClip.kannadaText}\nPronunciation: ${currentClip.transliteration}\nEnglish: ${currentClip.originalText}`
        );
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Sharing failed:', err);
    } finally {
      setIsExporting(null);
    }
  };

  // Copy Kannada script & pronunciation
  const handleCopyScript = async () => {
    if (!currentClip) return;
    const textToCopy = `${currentClip.kannadaText}\n${currentClip.transliteration}`;
    await navigator.clipboard.writeText(textToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const progressPercent = duration > 0 ? Math.min(1.0, Math.max(0, currentTime / duration)) : 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-5 shadow-xl">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            Master Audio Output Deck
          </span>
          {currentClip ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-semibold text-white">
                Voice: {currentClip.voiceName}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-amber-400 font-mono-num">
                {currentClip.sampleRate} Hz Lossless PCM
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-slate-400 font-mono-num">
                Pitch: {pitch > 0 ? `+${pitch}` : pitch} st / Speed: {speed.toFixed(2)}x
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">
              Generate speech above to listen, tune, and export in MP3, WAV, or AAC
            </p>
          )}
        </div>

        {currentClip && (
          <button
            onClick={handleCopyScript}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
            title="Copy Kannada script & phonetics"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied Script</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Script</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Interactive Waveform Visualizer */}
      <WaveformVisualizer
        waveformPeaks={waveformPeaks}
        progress={progressPercent}
        isPlaying={isPlaying}
        onSeek={handleSeek}
        duration={duration}
        currentTime={currentTime}
      />

      {/* Main Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Left: Transport buttons */}
        <div className="flex items-center gap-2">
          {/* Skip backward 5s */}
          <button
            type="button"
            disabled={!audioBuffer}
            onClick={() => skipSeconds(-5)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Rewind 5 seconds"
          >
            <Rewind className="w-4 h-4" />
          </button>

          {/* Big Play/Pause Button */}
          <button
            type="button"
            disabled={!audioBuffer}
            onClick={togglePlay}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
            } disabled:opacity-30 disabled:pointer-events-none`}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Skip forward 5s */}
          <button
            type="button"
            disabled={!audioBuffer}
            onClick={() => skipSeconds(5)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Fast forward 5 seconds"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Loop toggle */}
          <button
            type="button"
            disabled={!audioBuffer}
            onClick={() => setIsLooping(!isLooping)}
            className={`p-2 rounded-lg border transition-colors ${
              isLooping
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800'
            } disabled:opacity-30 disabled:pointer-events-none`}
            title={isLooping ? 'Looping enabled' : 'Enable loop'}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Volume Control */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!audioBuffer}
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-300" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            disabled={!audioBuffer}
            className="w-20 sm:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
          />
          <span className="text-[11px] font-mono-num text-slate-400 w-8">
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>

        {/* Right: Export & Share Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Share Button */}
          <button
            type="button"
            disabled={!audioBuffer || isExporting !== null}
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none shadow-sm"
            title="Share audio to WhatsApp, Telegram, or AirDrop"
          >
            {isExporting === 'share' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : shareSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{shareSuccess ? 'Shared / Saved' : 'Share Audio'}</span>
          </button>

          {/* Download MP3 */}
          <button
            type="button"
            disabled={!audioBuffer || isExporting !== null}
            onClick={() => handleExport('mp3')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Download high-quality MP3 (192kbps)"
          >
            {isExporting === 'mp3' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>.MP3</span>
          </button>

          {/* Download WAV */}
          <button
            type="button"
            disabled={!audioBuffer || isExporting !== null}
            onClick={() => handleExport('wav')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Download uncompressed studio WAV (24kHz 16-bit)"
          >
            {isExporting === 'wav' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>.WAV</span>
          </button>

          {/* Download AAC */}
          <button
            type="button"
            disabled={!audioBuffer || isExporting !== null}
            onClick={() => handleExport('aac')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Download high-efficiency AAC"
          >
            {isExporting === 'aac' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>.AAC</span>
          </button>
        </div>
      </div>

      {/* Export note */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
        <span>
          Exported files (.mp3, .wav, .aac) are rendered with your selected voice pitch ({pitch > 0 ? `+${pitch}` : pitch} st) and speed rate ({speed.toFixed(2)}x).
        </span>
        <span className="hidden sm:inline text-slate-400">
          Press <kbd className="px-1 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono-num">Space</kbd> to toggle playback
        </span>
      </div>
    </div>
  );
};
