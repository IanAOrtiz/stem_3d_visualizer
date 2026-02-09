import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, Save, RotateCcw } from 'lucide-react';
import { createParameterPatch, resolveParameterControls, ResolvedParameterControl } from '../services/parameterControls';

interface ParameterControlsPanelProps {
  scenePlan: any | null;
  isLightMode: boolean;
  isBusy: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onCommit: (parameterPatch: Record<string, number>) => Promise<void> | void;
}

const ParameterControlsPanel: React.FC<ParameterControlsPanelProps> = ({
  scenePlan,
  isLightMode,
  isBusy,
  iframeRef,
  onCommit,
}) => {
  const controls = useMemo(() => resolveParameterControls(scenePlan), [scenePlan]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initial: Record<string, number> = {};
    const runtimeInitial: Record<string, number> = {};
    for (const control of controls) {
      initial[control.key] = control.value;
      if (control.controlClass === 'runtime_tunable') {
        runtimeInitial[control.key] = control.value;
      }
    }
    setValues(initial);
    // Seed the iframe with initial runtime param values.
    if (Object.keys(runtimeInitial).length > 0) {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.postMessage({ type: 'SET_PARAMS', params: runtimeInitial }, '*');
      }
    }
  }, [controls, iframeRef]);

  // Send runtime_tunable params directly to iframe via postMessage.
  const sendToIframe = useCallback((params: Record<string, number>) => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.postMessage({ type: 'SET_PARAMS', params }, '*');
    }
  }, [iframeRef]);

  const handleSliderChange = useCallback((control: ResolvedParameterControl, next: number) => {
    setValues((prev) => ({ ...prev, [control.key]: next }));

    if (control.controlClass === 'runtime_tunable') {
      sendToIframe({ [control.key]: next });
    }
  }, [sendToIframe]);

  // Patch only includes plan_tunable changes (runtime_tunable already applied live).
  const planTunablePatch = useMemo(() => {
    const planControls = controls.filter(c => c.controlClass === 'plan_tunable');
    return createParameterPatch(planControls, values);
  }, [controls, values]);

  const hasPlanChanges = Object.keys(planTunablePatch).length > 0;

  if (!scenePlan || controls.length === 0) return null;

  const reset = () => {
    const initial: Record<string, number> = {};
    for (const control of controls) {
      initial[control.key] = control.value;
    }
    setValues(initial);
    // Reset runtime_tunable params in iframe too
    const runtimeResets: Record<string, number> = {};
    for (const control of controls) {
      if (control.controlClass === 'runtime_tunable') {
        runtimeResets[control.key] = control.value;
      }
    }
    if (Object.keys(runtimeResets).length > 0) {
      sendToIframe(runtimeResets);
    }
  };

  const commit = async () => {
    if (isBusy || isSubmitting || !hasPlanChanges) return;
    setIsSubmitting(true);
    try {
      await onCommit(planTunablePatch);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasRuntimeOnly = controls.every(c => c.controlClass === 'runtime_tunable');

  return (
    <div
      className={`absolute bottom-8 right-8 z-[95] w-80 rounded-2xl border backdrop-blur-2xl shadow-2xl ${
        isLightMode ? 'bg-white/85 border-slate-200 text-slate-900' : 'bg-black/45 border-neutral-800 text-white'
      }`}
    >
      <div className={`px-4 py-3 border-b ${isLightMode ? 'border-slate-200' : 'border-white/10'} flex items-center gap-2`}>
        <SlidersHorizontal size={13} className="text-emerald-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Parameter Controls</span>
      </div>

      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {controls.map((control) => {
          const value = values[control.key] ?? control.value;
          const isReadOnly = control.controlClass === 'read_only';
          const isRuntime = control.controlClass === 'runtime_tunable';
          return (
            <div key={control.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                  {control.label}
                  {isRuntime && <span className="ml-1.5 text-[8px] font-normal text-emerald-500 opacity-70">LIVE</span>}
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  {value.toFixed(3)}{control.unit ? ` ${control.unit}` : ''}
                </span>
              </div>
              {isReadOnly ? (
                <div className="h-1.5 bg-neutral-700/30 rounded-full" />
              ) : (
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={value}
                  onChange={(e) => handleSliderChange(control, Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              )}
              <div className="flex justify-between text-[10px] font-mono opacity-40">
                <span>{control.min}</span>
                <span>{control.max}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`px-4 py-3 border-t ${isLightMode ? 'border-slate-200' : 'border-white/10'} flex items-center gap-2`}>
        <button
          onClick={reset}
          disabled={isBusy || isSubmitting}
          className="flex-1 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/15 hover:bg-white/10 disabled:opacity-40"
        >
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw size={12} />
            Reset
          </span>
        </button>
        {!hasRuntimeOnly && (
          <button
            onClick={commit}
            disabled={isBusy || isSubmitting || !hasPlanChanges}
            className="flex-1 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-1.5">
              <Save size={12} />
              Commit Variant
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ParameterControlsPanel;
