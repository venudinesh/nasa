import React from 'react';
import { Planet } from '../lib/filters';

interface CompareTrayProps {
  planets: Planet[];
  onRemove: (p: Planet) => void;
  onReorder: (newOrder: Planet[]) => void;
}

const CompareTray: React.FC<CompareTrayProps> = ({ planets, onRemove, onReorder }) => {
  const dragIndex = React.useRef<number | null>(null);

  const onDragStart = (e: React.DragEvent, idx: number) => {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === idx) return;
    const next = [...planets];
    const [item] = next.splice(from, 1);
    next.splice(idx, 0, item);
    dragIndex.current = null;
    onReorder(next);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  return (
    <div className="compare-tray fixed left-4 bottom-24 z-50 w-80 bg-black/70 backdrop-blur-md p-3 rounded-lg border border-neon-cyan/20">
      <div className="flex items-center justify-between mb-2">
        <div className="text-neon-cyan font-semibold">Compare ({planets.length}/3)</div>
        <div className="text-xs text-gray-300">Drag to reorder</div>
      </div>
      <div className="space-y-2">
        {planets.map((p, i) => (
          <div key={p.pl_name + i} draggable onDragStart={(e) => onDragStart(e, i)} onDragOver={onDragOver} onDrop={(e) => onDrop(e, i)} className="flex items-center gap-2 p-2 bg-gray-900/40 rounded hover:bg-gray-900/60">
            <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-sm">{p.pl_name ? p.pl_name.charAt(0) : '?'}</div>
            <div className="flex-1 text-xs text-neon-cyan truncate">{p.pl_name}</div>
            <button onClick={() => onRemove(p)} className="text-sm text-red-400 px-2 py-1 rounded bg-transparent hover:bg-red-500/10">Remove</button>
          </div>
        ))}
        {planets.length === 0 && <div className="text-xs text-gray-400">Add up to 3 planets to compare</div>}
      </div>
    </div>
  );
};

export default CompareTray;
