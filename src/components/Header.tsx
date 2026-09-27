import React from 'react';
import { Volume2, History, BookOpen, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenPresets: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPresets,
  onOpenHistory,
  historyCount,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold text-lg font-kannada">
            ಕ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">
                Kalarava
              </span>
              <span className="font-kannada text-amber-400 font-semibold text-sm">
                ಕಲರವ
              </span>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-500/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Voice Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Premium English to Kannada Text-to-Speech & Phonetics
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenPresets}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Browse sample Kannada phrases"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Sample Phrases</span>
            <span className="sm:hidden">Phrases</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors relative"
            title="View saved voice generations"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Library</span>
            {historyCount > 0 && (
              <span className="ml-0.5 text-[10px] font-mono-num bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
