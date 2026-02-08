import React, { useState } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: 'good' | 'bad', reason: string) => void;
  isLightMode?: boolean;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, isLightMode = false }) => {
  const [selectedFeedback, setSelectedFeedback] = useState<'good' | 'bad' | null>(null);
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedFeedback) return;
    onSubmit(selectedFeedback, reason);
    setSelectedFeedback(null);
    setReason('');
    onClose();
  };

  const handleCancel = () => {
    setSelectedFeedback(null);
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`${isLightMode ? 'bg-white text-slate-900' : 'bg-[#1a1a1a] text-white'} p-8 rounded-2xl max-w-md w-full border ${isLightMode ? 'border-slate-200' : 'border-white/10'} shadow-2xl`}>
        <h2 className="text-xl font-bold mb-6 uppercase tracking-widest">Visualization Quality</h2>

        <p className={`mb-4 text-sm ${isLightMode ? 'text-slate-600' : 'text-neutral-400'}`}>
          Was this visualization good or bad?
        </p>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setSelectedFeedback('good')}
            className={`flex-1 px-6 py-3 rounded-xl border transition-all ${
              selectedFeedback === 'good'
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : isLightMode
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
            }`}
          >
            Good
          </button>
          <button
            onClick={() => setSelectedFeedback('bad')}
            className={`flex-1 px-6 py-3 rounded-xl border transition-all ${
              selectedFeedback === 'bad'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : isLightMode
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
            }`}
          >
            Bad
          </button>
        </div>

        <textarea
          placeholder="Why? (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border ${
            isLightMode
              ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              : 'bg-white/5 border-white/10 text-white placeholder-neutral-500'
          } focus:outline-none focus:ring-2 ${
            isLightMode ? 'focus:ring-blue-500' : 'focus:ring-cyan-500'
          } mb-6 resize-none`}
          rows={3}
        />

        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={!selectedFeedback}
            className={`flex-1 px-6 py-3 rounded-xl border transition-all ${
              selectedFeedback
                ? isLightMode
                  ? 'bg-blue-500 border-blue-600 text-white hover:bg-blue-600'
                  : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30'
                : isLightMode
                ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                : 'bg-white/5 border-white/10 text-neutral-600 cursor-not-allowed'
            }`}
          >
            Submit
          </button>
          <button
            onClick={handleCancel}
            className={`flex-1 px-6 py-3 rounded-xl border transition-all ${
              isLightMode
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
