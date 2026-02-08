
import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Cpu, Info, ChevronRight, Binary, Image as ImageIcon, X, Paperclip, Zap, Copy, Check, Code } from 'lucide-react';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, image?: { data: string, mimeType: string }) => void;
  onApplyEdit: (prompt: string) => void;
  isLoading: boolean;
  isLightMode: boolean;
  placeholder?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, onApplyEdit, isLoading, isLightMode, placeholder: customPlaceholder }) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string, preview: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImage) && !isLoading) {
      onSendMessage(input.trim(), selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined);
      setInput('');
      setSelectedImage(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setSelectedImage({
          data: base64,
          mimeType: file.type,
          preview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            setSelectedImage({
              data: base64,
              mimeType: file.type,
              preview: reader.result as string
            });
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const themeClasses = isLightMode 
    ? {
        bg: 'bg-white',
        border: 'border-slate-200',
        header: 'bg-slate-50',
        text: 'text-slate-900',
        subtext: 'text-slate-500',
        msgUser: 'bg-cyan-50 border-cyan-100 text-slate-800',
        msgAi: 'bg-white border-slate-200 text-slate-700',
        inputBg: 'bg-slate-50',
        inputBorder: 'border-slate-200',
        footer: 'bg-white',
        codeBg: 'bg-slate-50/80 border-slate-200'
      }
    : {
        bg: 'bg-neutral-900',
        border: 'border-neutral-800',
        header: 'bg-black/40',
        text: 'text-white',
        subtext: 'text-neutral-500',
        msgUser: 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-50',
        msgAi: 'bg-black/50 border border-white/5 text-neutral-200',
        inputBg: 'bg-black/30',
        inputBorder: 'border-neutral-700',
        footer: 'bg-neutral-900',
        codeBg: 'bg-[#050505] border-white/10'
      };

  const renderContent = (content: string, msgId: string) => {
    const codeRegex = /```(?:html|javascript|threejs|js)?\s*([\s\S]*?)```/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    const cleanContent = content
      .replace(/\[METADATA\][\s\S]*?\[\/METADATA\]/gi, '')
      .replace(/\[SUGGESTED_EDIT\][\s\S]*?\[\/SUGGESTED_EDIT\]/gi, '');

    while ((match = codeRegex.exec(cleanContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <div key={`text-${lastIndex}`} className="whitespace-pre-wrap font-medium leading-relaxed mb-4">
            {cleanContent.substring(lastIndex, match.index)}
          </div>
        );
      }
      const code = match[1].trim();
      const codeId = `${msgId}-code-${lastIndex}`;
      parts.push(
        <div key={`code-${match.index}`} className={`my-6 rounded-xl border overflow-hidden shadow-2xl ${themeClasses.codeBg}`}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-inherit bg-black/20">
            <div className="flex items-center gap-2">
              <Code size={12} className="text-cyan-400" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">System.Source</span>
            </div>
            <button 
              onClick={() => copyToClipboard(code, codeId)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-cyan-400"
            >
              {copiedId === codeId ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div className="p-4 overflow-x-auto">
            <pre className="text-[11px] font-mono leading-relaxed text-cyan-50/90 selection:bg-cyan-500/30">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      );
      lastIndex = codeRegex.lastIndex;
    }

    if (lastIndex < cleanContent.length) {
      parts.push(
        <div key={`text-end`} className="whitespace-pre-wrap font-medium leading-relaxed">
          {cleanContent.substring(lastIndex)}
        </div>
      );
    }

    return parts;
  };

  return (
    <div className={`flex flex-col h-full ${themeClasses.bg} border-r ${themeClasses.border} transition-colors duration-200`}>
      <header className={`px-6 py-5 border-b ${themeClasses.border} flex items-center justify-between ${themeClasses.header} backdrop-blur-xl`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Terminal size={16} className="text-cyan-500" />
          </div>
          <div>
            <h2 className={`text-xs font-bold tracking-[0.2em] uppercase ${themeClasses.text}`}>Architect Terminal</h2>
            <p className={`text-[9px] font-bold uppercase tracking-widest opacity-40 mt-0.5`}>v4.2.0-STABLE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-cyan-500'}`} />
          <span className={`text-[9px] uppercase font-bold tracking-widest ${themeClasses.subtext}`}>{isLoading ? 'Computing' : 'Ready'}</span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[95%] p-5 rounded-2xl text-sm border shadow-xl transition-all ${
              msg.role === 'user' ? themeClasses.msgUser : themeClasses.msgAi
            }`}>
              <div className="mb-3 flex items-center justify-between opacity-50">
                <div className="flex items-center gap-2">
                  {msg.role === 'user' ? <Binary size={14} className="text-cyan-500" /> : <Cpu size={14} className="text-fuchsia-500" />}
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono">
                    {msg.role === 'user' ? 'INPUT_SEQ' : 'SYS_CORE'}
                  </span>
                </div>
                <span className="text-[9px] font-mono">#{msg.id.slice(-4)}</span>
              </div>
              <div className="content-rendered">
                {renderContent(msg.content, msg.id)}
              </div>
            </div>
            <span className={`mt-2 mx-2 text-[8px] uppercase font-bold tracking-widest ${isLightMode ? 'text-slate-400' : 'text-neutral-600'}`}>
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col items-start animate-pulse">
             <div className={`max-w-[80%] p-5 rounded-2xl border ${themeClasses.msgAi} bg-cyan-500/5`}>
                <div className="flex space-x-3 items-center">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-500/60 ml-2">Synthesizing...</span>
                </div>
             </div>
          </div>
        )}
      </div>

      <footer className={`p-6 border-t ${themeClasses.border} ${themeClasses.footer} bg-black/10`}>
        {selectedImage && (
          <div className="mb-4 relative inline-block">
            <img src={selectedImage.preview} alt="Upload preview" className="h-20 w-auto rounded-lg border border-cyan-500/30 object-cover" />
            <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors">
              <X size={12} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            disabled={isLoading}
            placeholder={selectedImage ? "Describe simulation constraints..." : (customPlaceholder || "Execute architectural command...")}
            className={`w-full ${themeClasses.inputBg} border ${themeClasses.inputBorder} rounded-xl py-4 px-5 pl-12 pr-14 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all ${isLightMode ? 'placeholder:text-slate-400' : 'placeholder:text-neutral-700'} disabled:opacity-50 font-medium`}
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center">
            <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-lg transition-all ${isLightMode ? 'text-slate-400 hover:text-cyan-600' : 'text-neutral-600 hover:text-cyan-400'}`} title="Add Image Reference">
              <ImageIcon size={18} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
          </div>
          <button type="submit" disabled={isLoading || (!input.trim() && !selectedImage)} className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center ${isLightMode ? 'text-slate-400 hover:bg-slate-200 hover:text-cyan-600' : 'text-neutral-600 hover:bg-neutral-800 hover:text-cyan-400'} disabled:opacity-20 transition-all`}>
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatInterface;
