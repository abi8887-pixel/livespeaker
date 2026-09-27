import React, { useState } from 'react';
import { X, BookOpen, ArrowRight } from 'lucide-react';
import { PRESET_PHRASES } from '../utils/presets';
import { PresetPhrase } from '../types';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhrase: (phrase: PresetPhrase) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPhrase,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'Everyday', 'Travel & Auto', 'Hospitality & Food', 'Formal & Work', 'Festive'];

  const filtered = selectedCategory === 'All'
    ? PRESET_PHRASES
    : PRESET_PHRASES.filter((p) => p.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Kannada Phrase Library
              </h3>
              <p className="text-xs text-slate-400">
                Curated everyday, conversational, and cultural phrases
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-3 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Phrases List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {filtered.map((phrase, idx) => (
            <div
              key={idx}
              onClick={() => {
                onSelectPhrase(phrase);
                onClose();
              }}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-950 transition-all cursor-pointer group flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400">
                  {phrase.title}
                </span>
                <span className="text-[11px] text-slate-400">
                  {phrase.category}
                </span>
              </div>
              <p className="text-sm text-slate-200 group-hover:text-white transition-colors">
                "{phrase.english}"
              </p>
              {phrase.kannadaHint && (
                <div className="text-xs text-amber-300/80 font-kannada pt-1 border-t border-slate-800/50 flex items-center justify-between">
                  <span>{phrase.kannadaHint}</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-amber-400 font-sans">
                    Use Phrase <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
