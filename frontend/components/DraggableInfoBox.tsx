
import React, { useState, useRef } from 'react';
import { X, GripHorizontal, Info, Target, Box } from 'lucide-react';

interface DraggableInfoBoxProps {
  title: string;
  description: string;
  type: 'metadata' | 'inspector';
  onClose: () => void;
  isLightMode: boolean;
  initialPos?: { x: number; y: number };
}

const DraggableInfoBox: React.FC<DraggableInfoBoxProps> = ({ 
  title, 
  description, 
  type, 
  onClose, 
  isLightMode,
  initialPos = { x: 20, y: 20 }
}) => {
  const [position, setPosition] = useState(initialPos);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header
    if (!(e.target as HTMLElement).closest('.drag-handle')) return;
    
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.startPosX + dx,
      y: dragRef.current.startPosY + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  const accentColor = type === 'metadata' ? 'text-cyan-500' : 'text-fuchsia-500';
  const borderAccent = type === 'metadata' ? 'border-cyan-500/30' : 'border-fuchsia-500/30';
  const badgeBg = type === 'metadata' 
    ? (isLightMode ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-900/40 text-cyan-400')
    : (isLightMode ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-fuchsia-900/40 text-fuchsia-400');

  return (
    <div
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      className={`absolute z-[100] w-72 md:w-80 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border transition-all duration-200 ${
        isLightMode 
          ? 'bg-white/95 border-slate-200 text-slate-800' 
          : 'bg-[#0f0f0f]/95 border-neutral-800 text-neutral-100'
      } ${borderAccent} backdrop-blur-2xl overflow-hidden`}
    >
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`drag-handle flex items-center justify-between p-4 cursor-grab active:cursor-grabbing border-b ${
          isLightMode ? 'bg-slate-50/80 border-slate-200' : 'bg-neutral-800/40 border-neutral-700/50'
        }`}
      >
        <div className="flex items-center gap-3">
          {type === 'metadata' ? <Info size={16} className={accentColor} /> : <Target size={16} className={accentColor} />}
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-50">
            {type === 'metadata' ? 'Logic Specs' : 'Visual Inspector'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <GripHorizontal size={16} className="opacity-20" />
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${badgeBg} bg-opacity-10`}>
             {type === 'metadata' ? <Box size={14} /> : <Target size={14} />}
          </div>
          <h3 className="text-sm font-bold uppercase tracking-tight truncate leading-none">{title}</h3>
        </div>
        <div className={`text-[11px] leading-relaxed opacity-80 font-medium whitespace-pre-wrap p-3 rounded-xl ${isLightMode ? 'bg-slate-100' : 'bg-black/40'}`}>
          {description}
        </div>
        {type === 'inspector' && (
           <div className="pt-2 flex justify-between items-center opacity-40 text-[9px] font-bold uppercase tracking-widest border-t border-white/5">
              <span>AXIAL_LOCKED: YES</span>
              <span>REF: 0xFD42</span>
           </div>
        )}
      </div>
    </div>
  );
};

export default DraggableInfoBox;
