import React from 'react';
import { Sliders, Volume2, Gauge, RotateCcw, Sparkles } from 'lucide-react';
import { VOICE_OPTIONS } from '../utils/presets';
import { VoiceOption } from '../types';

interface StudioControlsProps {
  selectedVoice: 'Kore' | 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr';
  onSelectVoice: (voice: 'Kore' | 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr') => void;
  tone: 'natural' | 'formal' | 'warm' | 'storytelling';
  onChangeTone: (tone: 'natural' | 'formal' | 'warm' | 'storytelling') => void;
  pitch: number; // semitones (-12 to +12)
  onChangePitch: (val: number) => void;
  speed: number; // rate (0.5 to 2.0)
  onChangeSpeed: (val: number) => void;
}

export const StudioControls: React.FC<StudioControlsProps> = ({
  selectedVoice,
  onSelectVoice,
  tone,
  onChangeTone,
  pitch,
  onChangePitch,
  speed,
  onChangeSpeed,
}) => {
  const pitchPresets = [
    { label: 'Deep', val: -4 },
    { label: 'Natural', val: 0 },
    { label: 'Higher', val: 3 },
    { label: 'Bright', val: 6 },
  ];

  const speedPresets = [
    { label: '0.75x', val: 0.75 },
    { label: '1.0x', val: 1.0 },
    { label: '1.25x', val: 1.25 },
    { label: '1.5x', val: 1.5 },
  ];

  const toneOptions: { id: 'natural' | 'formal' | 'warm' | 'storytelling'; label: string; desc: string }[] = [
    { id: 'natural', label: 'Everyday / Colloquial', desc: 'Natural conversational spoken Kannada' },
    { id: 'formal', label: 'Formal / Official', desc: 'High-register, respectful announcements' },
    { id: 'warm', label: 'Warm & Friendly', desc: 'Gentle, affectionate, welcoming cadence' },
    { id: 'storytelling', label: 'Expressive / Story', desc: 'Rhythmic, emotive narrative style' },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-6">
      {/* Section Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
            Acoustic & Voice Configuration
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Studio 24kHz Audio Processing
        </span>
      </div>

      {/* Voice Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
          Select Voice Persona
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {VOICE_OPTIONS.map((voice: VoiceOption) => {
            const isSelected = selectedVoice === voice.id;
            return (
              <button
                key={voice.id}
                type="button"
                onClick={() => onSelectVoice(voice.id)}
                className={`text-left p-3 rounded-lg border transition-all relative ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{voice.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono-num">{voice.gender}</span>
                </div>
                <div className="text-xs text-amber-400/90 font-medium mb-1">
                  {voice.tone}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {voice.description}
                </p>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tone & Style Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Speaking Tone & Nuance
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {toneOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTone(item.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                tone === item.id
                  ? 'bg-slate-800 text-amber-400 border-amber-500/50'
                  : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <div className="font-semibold text-slate-200">{item.label}</div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dual Sliders: Pitch & Speed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Pitch Control */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <label htmlFor="pitch-slider" className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Voice Pitch
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono-num text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)} st ({Math.round(pitch * 100)} cents)
              </span>
              {pitch !== 0 && (
                <button
                  type="button"
                  onClick={() => onChangePitch(0)}
                  className="text-slate-400 hover:text-slate-200 p-1"
                  title="Reset Pitch to 0"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <input
            id="pitch-slider"
            type="range"
            min="-12"
            max="12"
            step="0.5"
            value={pitch}
            onChange={(e) => onChangePitch(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">-12 st (Deep Bass)</span>
            <div className="flex items-center gap-1">
              {pitchPresets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChangePitch(p.val)}
                  className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                    pitch === p.val
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500">+12 st (High Treble)</span>
          </div>
        </div>

        {/* Speed Control */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <label htmlFor="speed-slider" className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Speech Speed Rate
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono-num text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {speed.toFixed(2)}x ({Math.round(speed * 100)}%)
              </span>
              {speed !== 1.0 && (
                <button
                  type="button"
                  onClick={() => onChangeSpeed(1.0)}
                  className="text-slate-400 hover:text-slate-200 p-1"
                  title="Reset Speed to 1.0x"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <input
            id="speed-slider"
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={speed}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">0.5x (Slow)</span>
            <div className="flex items-center gap-1">
              {speedPresets.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => onChangeSpeed(s.val)}
                  className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                    Math.abs(speed - s.val) < 0.02
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500">2.0x (Fast)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
