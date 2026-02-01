
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, GripVertical, Send, Loader2, Eye, Zap, SlidersHorizontal, Activity, GraduationCap, Sparkles, ChevronRight, Camera } from 'lucide-react';
import { CustomVector, Message } from '../types';
import { geminiService } from '../services/gemini';

interface SimulationAssistantProps {
  isOpen: boolean;
  activeCode: string;
  metadata: any;
  customVectors: CustomVector[];
  onClose: () => void;
  isLightMode: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onApplyEdit: (prompt: string) => void;
  isLoading: boolean;
  setTime: (t: number) => void;
  setIsPlaying: (p: boolean) => void;
  onCameraUpdate: (cameraData: { position: { x: number, y: number, z: number }, target: { x: number, y: number, z: number } }) => void;
}

const SimulationAssistant: React.FC<SimulationAssistantProps> = ({ 
  isOpen,
  activeCode, 
  metadata, 
  customVectors,
  onClose, 
  isLightMode,
  messages,
  setMessages,
  onApplyEdit,
  isLoading,
  setTime,
  setIsPlaying,
  onCameraUpdate
}) => {
  const [width, setWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const renderMathContent = useCallback(() => {
    if (!sidebarRef.current || !(window as any).MathJax) return;
    try {
      (window as any).MathJax.typesetPromise([sidebarRef.current]).then(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (err) {
      console.error("MathJax Render Error:", err);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const timer = setTimeout(renderMathContent, 150);
    return () => clearTimeout(timer);
  }, [messages, isThinking, renderMathContent]);

  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback((e: MouseEvent | TouchEvent) => {
    if (isResizing) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const newWidth = window.innerWidth - clientX;
      if (newWidth > 300 && newWidth < window.innerWidth * 0.8) {
        setWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    window.addEventListener('touchmove', resize);
    window.addEventListener('touchend', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', resize);
      window.removeEventListener('touchend', stopResizing);
    };
  }, [resize, stopResizing]);

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const userText = input.trim();
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }]
      }));

      const response = await geminiService.sendTutorMessage(history, userText, activeCode);
      
      let textContent = "";
      let toolExecutionStatus = "";
      
      const parts = response.candidates?.[0]?.content?.parts || [];
      
      // PROCESS TOOLS IMMEDIATELY
      for (const part of parts) {
        if (part.text) {
          textContent += part.text;
        }
        if (part.functionCall) {
          const fc = part.functionCall;
          if (fc.name === 'updateSimulationTime') {
            const { t } = fc.args as any;
            if (typeof t === 'number') {
              setIsPlaying(false);
              setTime(t);
              toolExecutionStatus += `\n\n[Demonstration: Timeline fixed at t=${t.toFixed(2)}]`;
            }
          }
          if (fc.name === 'adjustCamera') {
            const { intent } = fc.args as any;
            // TRIGGER CAMERA IMMEDIATELY
            geminiService.sendCameraManMessage(intent, activeCode).then(settings => {
              if (settings) onCameraUpdate(settings);
            });
            toolExecutionStatus += `\n\n[Cinematic Reframing Triggered]`;
          }
        }
      }

      let finalContent = textContent.trim();
      if (!finalContent && toolExecutionStatus) finalContent = "Applying requested visual adjustments.";
      finalContent += toolExecutionStatus;
      
      // Detect Architect Prompt [SUGGESTED_EDIT]
      const editMatch = finalContent.match(/\[SUGGESTED_EDIT\]([\s\S]*?)\[\/SUGGESTED_EDIT\]/i);
      let suggestedEdit: string | undefined;
      if (editMatch) {
        suggestedEdit = editMatch[1].trim();
      }

      const assistantMsg: Message = { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: finalContent, 
        timestamp: new Date(), 
        suggestedEdit: suggestedEdit 
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "SYSTEM_ERROR: Scientific core logic fault.", timestamp: new Date() }]);
    } finally {
      setIsThinking(false);
    }
  };

  const formatHubContent = (content: string) => {
    return content
      .replace(/\[METADATA\][\s\S]*?\[\/METADATA\]/gi, '')
      .replace(/\[SUGGESTED_EDIT\][\s\S]*?\[\/SUGGESTED_EDIT\]/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      .trim();
  };

  return (
    <div
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className={`fixed right-0 top-0 h-screen z-[150] flex flex-row shadow-2xl transition-transform duration-500 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } ${
        isLightMode ? 'bg-white/95 border-l border-slate-200' : 'bg-[#080808]/98 border-l border-fuchsia-500/20'
      } backdrop-blur-3xl`}
    >
      <div onMouseDown={startResizing} onTouchStart={startResizing} className={`w-1 h-full cursor-col-resize hover:bg-fuchsia-500/40 transition-colors flex items-center justify-center group ${isResizing ? 'bg-fuchsia-500/20' : ''}`}>
        <GripVertical size={16} className={`opacity-0 group-hover:opacity-40 text-fuchsia-400 ${isResizing ? 'opacity-100' : ''}`} />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className={`flex items-center justify-between p-6 border-b ${isLightMode ? 'bg-slate-50/50 border-slate-200' : 'bg-fuchsia-500/5 border-fuchsia-500/10'}`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-fuchsia-500/10 rounded-2xl flex items-center justify-center border border-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.1)]">
              <GraduationCap size={20} className="text-fuchsia-400" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-fuchsia-400 mb-0.5">Scientific Analysis Module</p>
              <h2 className={`text-sm font-bold uppercase tracking-tight ${isLightMode ? 'text-slate-800' : 'text-slate-100'}`}>Spaide Assistant</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[95%] p-5 rounded-2xl text-[13px] leading-relaxed transition-all shadow-sm ${
                m.role === 'user' 
                  ? (isLightMode ? 'bg-slate-100 text-slate-800' : 'bg-white/5 text-slate-100 border border-white/5')
                  : (isLightMode ? 'bg-fuchsia-50 text-slate-900 border border-fuchsia-100' : 'bg-fuchsia-500/10 text-fuchsia-50 border border-fuchsia-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.2)]')
              }`}>
                <div className="text-[8px] font-black uppercase tracking-[0.3em] mb-3 opacity-30">{m.role === 'user' ? 'Inquiry' : 'Assistant Theory'}</div>
                
                {m.content.includes('[Cinematic') && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-[9px] font-black uppercase tracking-widest text-cyan-400">
                    <Camera size={10} />
                    Active Reframing
                  </div>
                )}

                <div className="math-container whitespace-pre-wrap leading-[1.8]">{formatHubContent(m.content)}</div>
                
                {m.suggestedEdit && (
                  <div className="mt-5 pt-5 border-t border-fuchsia-500/20">
                    <div className={`mb-4 p-4 rounded-xl border ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-black/40 border-fuchsia-500/10'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-fuchsia-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400">Visualization Patch Proposed</span>
                      </div>
                      <div className={`p-3 rounded-lg text-[11px] font-mono leading-tight mb-4 ${isLightMode ? 'bg-white text-slate-700' : 'bg-[#050505] text-fuchsia-100/90'}`}>
                        {m.suggestedEdit}
                      </div>
                      <button 
                        onClick={() => onApplyEdit(m.suggestedEdit!)}
                        disabled={isLoading}
                        className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] bg-fuchsia-600 text-white hover:bg-fuchsia-700 active:scale-95 disabled:opacity-50`}
                      >
                        <Zap size={14} fill="currentColor" />
                        {isLoading ? 'Relaying Command...' : 'Execute Patch'}
                        <ChevronRight size={14} className="ml-auto" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="p-4 rounded-2xl border flex items-center gap-3 bg-fuchsia-500/5 border-fuchsia-500/10">
              <Loader2 size={14} className="animate-spin text-fuchsia-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400/80">Synchronizing Analysis...</span>
            </div>
          )}
          <div ref={chatEndRef} className="h-4" />
        </div>

        <div className={`p-6 border-t ${isLightMode ? 'border-slate-200' : 'border-white/5 bg-black/10'}`}>
          <div className="relative group">
            <input 
              type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Query scientific core..."
              className={`w-full py-4 px-5 pr-14 text-[13px] rounded-2xl outline-none transition-all ${isLightMode ? 'bg-white border-slate-200 focus:border-fuchsia-400 shadow-inner' : 'bg-[#050505] border border-white/5 focus:border-fuchsia-500/50 text-white placeholder-neutral-700'}`}
            />
            <button onClick={sendMessage} disabled={!input.trim() || isThinking} className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${!input.trim() || isThinking ? 'opacity-20 text-neutral-500' : 'text-fuchsia-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-300'}`}><Send size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationAssistant;
