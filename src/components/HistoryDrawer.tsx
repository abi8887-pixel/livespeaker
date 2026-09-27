import React from 'react';
import { X, Play, Trash2, Download, Clock, Music } from 'lucide-react';
import { AudioClip } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clips: AudioClip[];
  onSelectClip: (clip: AudioClip) => void;
  onDeleteClip: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  clips,
  onSelectClip,
  onDeleteClip,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Generated Audio Library
            </h3>
            <span className="text-xs text-slate-400 font-mono-num">
              ({clips.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {clips.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 hover:bg-red-500/10 rounded transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {clips.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <Clock className="w-8 h-8 stroke-1 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">
                No voice generations yet
              </p>
              <p className="text-xs text-slate-500">
                Generate an English to Kannada speech clip to save it to your library.
              </p>
            </div>
          ) : (
            clips.map((clip) => (
              <div
                key={clip.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-kannada text-amber-300 text-sm font-semibold line-clamp-1">
                    {clip.kannadaText}
                  </div>
                  <button
                    onClick={() => onDeleteClip(clip.id)}
                    className="text-slate-500 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete clip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs text-slate-400 line-clamp-1 italic">
                  "{clip.transliteration}"
                </div>

                <div className="text-[11px] text-slate-500 line-clamp-1">
                  En: {clip.originalText}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono-num">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400/90 font-semibold">{clip.voiceName}</span>
                    <span>·</span>
                    <span>{clip.pitch > 0 ? `+${clip.pitch}` : clip.pitch}st</span>
                    <span>·</span>
                    <span>{clip.speed.toFixed(2)}x</span>
                    <span>·</span>
                    <span>{formatDate(clip.createdAt)}</span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectClip(clip);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold font-sans hover:underline"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Load Clip
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
