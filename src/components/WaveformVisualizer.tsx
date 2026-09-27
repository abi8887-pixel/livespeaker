import React, { useRef, useEffect } from 'react';

interface WaveformVisualizerProps {
  waveformPeaks: number[];
  progress: number; // 0.0 to 1.0
  isPlaying: boolean;
  onSeek: (percentage: number) => void;
  duration: number;
  currentTime: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  waveformPeaks,
  progress,
  isPlaying,
  onSeek,
  duration,
  currentTime,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Default peaks if none available yet
  const peaks = waveformPeaks.length > 0 ? waveformPeaks : Array(60).fill(0.18);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const barCount = peaks.length;
    const totalGap = (barCount - 1) * 3;
    const barWidth = Math.max(2, (width - totalGap) / barCount);
    const centerY = height / 2;

    peaks.forEach((peak, index) => {
      const x = index * (barWidth + 3);
      const barProgress = index / barCount;
      const isPlayed = barProgress <= progress;

      // Dynamic animated wave effect when playing
      let effectiveHeight = peak * (height * 0.78);
      if (isPlaying) {
        const timeFactor = Date.now() * 0.005;
        const waveOffset = Math.sin(timeFactor + index * 0.3) * 3;
        effectiveHeight = Math.max(6, effectiveHeight + waveOffset);
      } else {
        effectiveHeight = Math.max(4, effectiveHeight);
      }

      const topY = centerY - effectiveHeight / 2;

      // Color selection: Played vs Unplayed
      if (isPlayed) {
        const gradient = ctx.createLinearGradient(0, topY, 0, topY + effectiveHeight);
        gradient.addColorStop(0, '#fbbf24');
        gradient.addColorStop(1, '#d97706');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#334155';
      }

      ctx.beginPath();
      // Rounded bar cap
      const radius = Math.min(2, barWidth / 2);
      ctx.roundRect(x, topY, barWidth, effectiveHeight, radius);
      ctx.fill();
    });

    // Draw playhead vertical line
    const playheadX = progress * width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.max(0, playheadX - 1), 2, 2, height - 4);

    // Small glowing dot on playhead
    ctx.beginPath();
    ctx.arc(playheadX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [peaks, progress, isPlaying]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = x / rect.width;
    onSeek(percent);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div ref={containerRef} className="w-full select-none">
      <div className="relative group cursor-pointer">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          className="w-full h-24 block rounded-lg bg-slate-900/80 border border-slate-800 transition-colors group-hover:border-slate-700"
        />
      </div>
      <div className="flex items-center justify-between text-xs font-mono-num text-slate-400 mt-2 px-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          {formatTime(currentTime)}
        </span>
        <span className="text-slate-500">
          Duration: {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};
