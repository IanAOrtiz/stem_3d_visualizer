
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  GripVertical, 
  Activity, 
  Clock, 
  AlertTriangle, 
  Cpu, 
  Play, 
  Pause, 
  RotateCcw, 
  LineChart, 
  X, 
  Maximize2, 
  Zap, 
  Search, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Camera
} from 'lucide-react';
import { CustomVector } from '../types';

interface VisualizerProps {
  code: string;
  isLightMode: boolean;
  time: number;
  setTime: (t: number) => void;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  playbackRate: number;
  setPlaybackRate: (r: number) => void;
  metadata?: { title: string; description: string; subject: string; temporalMode?: string };
  customVectors: CustomVector[];
  setCustomVectors: React.Dispatch<React.SetStateAction<CustomVector[]>>;
  onTelemetryUpdate?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  initialParams?: Record<string, number>;
}

interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'system';
  message: string;
  time: string;
}

interface TelemetryPoint {
  t: number;
  values: Record<string, number>;
}

const Visualizer: React.FC<VisualizerProps> = ({
  code, isLightMode, time, setTime, isPlaying, setIsPlaying, playbackRate, setPlaybackRate, metadata,
  customVectors, setCustomVectors, onTelemetryUpdate, iframeRef: externalIframeRef, initialParams
}) => {
  const internalRef = useRef<HTMLIFrameElement>(null);
  const iframeRef = externalIframeRef || internalRef;
  const [isLoaded, setIsLoaded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [isGraphExpanded, setIsGraphExpanded] = useState(false);
  const [hasHeartbeat, setHasHeartbeat] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  
  const [customSearch, setCustomSearch] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showStandardTelemetry, setShowStandardTelemetry] = useState(true);

  const [hudPos, setHudPos] = useState({ x: window.innerWidth - 340, y: 80 }); 
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const timeRef = useRef(time);
  useEffect(() => { timeRef.current = time; }, [time]);

  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  useEffect(() => { onTelemetryUpdateRef.current = onTelemetryUpdate; }, [onTelemetryUpdate]);

  const prevTimeRef = useRef(time);
  useEffect(() => {
    if (time < prevTimeRef.current - 0.1 || (time < 0.01 && prevTimeRef.current > 0.9)) {
      setTelemetryHistory([]);
    }
    prevTimeRef.current = time;
  }, [time]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const handle = (e.target as HTMLElement).closest('.hud-drag-handle');
    if (!handle) return;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - hudPos.x, y: e.clientY - hudPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setHudPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };

  const handlePointerUp = () => setIsDragging(false);

  useEffect(() => {
    if (isLoaded && iframeRef.current?.contentWindow) {
      try {
        const win = iframeRef.current.contentWindow as any;
        if (typeof win.renderFrame === 'function') {
          win.renderFrame(time);
        }
      } catch (e) {}
    }
  }, [time, isLoaded]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'IFRAME_LOG') {
        const msg = String(event.data.message);
        const level = event.data.level || 'log';
        if (msg.includes('SYSTEM_HEARTBEAT')) setHasHeartbeat(true);
        if (msg.startsWith('TELEMETRY:')) {
          const parts = msg.replace('TELEMETRY:', '').split('=');
          if (parts.length === 2) {
            const key = parts[0].trim();
            const val = parts[1].trim();
            const numVal = parseFloat(val);
            if (onTelemetryUpdateRef.current) {
              onTelemetryUpdateRef.current(prev => ({ ...prev, [key]: val }));
            }
            if (!isNaN(numVal)) {
              const currentTime = timeRef.current;
              setTelemetryHistory(prev => {
                const lastPoint = prev[prev.length - 1];
                if (!lastPoint || Math.abs(lastPoint.t - currentTime) > 0.0005) {
                  const newValues = lastPoint ? { ...lastPoint.values, [key]: numVal } : { [key]: numVal };
                  return [...prev.slice(-2000), { t: currentTime, values: newValues }].sort((a, b) => a.t - b.t);
                } else {
                  return prev.map((p, idx) => idx === prev.length - 1 ? { ...p, values: { ...p.values, [key]: numVal } } : p);
                }
              });
            }
          }
          return; 
        }
        if (level === 'error') setErrorCount(prev => prev + 1);
        setLogs(prev => [...prev.slice(-19), { 
          type: level, message: msg,
          time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })
        }]);
      }
      if (event.data?.type === 'IFRAME_ERROR') {
        setErrorCount(prev => prev + 1);
        setLogs(prev => [...prev.slice(-19), { 
          type: 'error', message: event.data.message,
          time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (iframeRef.current && code) {
      setIsLoaded(false);
      setHasHeartbeat(false);
      if (onTelemetryUpdate) onTelemetryUpdate({});
      setTelemetryHistory([]);
      setErrorCount(0);
      const themeBg = isLightMode ? '#fdfdfd' : '#050505';
      const themeColor = isLightMode ? '#0f172a' : '#e2e8f0';
      const sandboxSetup = `
        <style>
          body { background-color: ${themeBg} !important; color: ${themeColor} !important; margin: 0; padding: 0; overflow: hidden; height: 100vh; width: 100vw; }
          #canvas-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
        </style>
        <script type="importmap">
        {
          "imports": {
            "three": "https://unpkg.com/three@0.173.0/build/three.module.js",
            "three/addons/": "https://unpkg.com/three@0.173.0/examples/jsm/",
            "three/examples/jsm/": "https://unpkg.com/three@0.173.0/examples/jsm/"
          }
        }
        </script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
        <script>
          (function() {
            window.__params = ${JSON.stringify(initialParams || {})};

            const tunnel = (level, args) => {
               window.parent.postMessage({ type: 'IFRAME_LOG', level, message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
            };
            console.log = (...args) => tunnel('log', args);
            console.warn = (...args) => tunnel('warn', args);
            console.error = (...args) => tunnel('error', args);
            window.onerror = (msg, url, line, col, error) => {
              window.parent.postMessage({ type: 'IFRAME_ERROR', message: \`Line \${line}: \${msg}\` }, '*');
              return false;
            };

            window.addEventListener('message', (event) => {
              if (event.data?.type === 'SET_CAMERA') {
                const { position, target } = event.data;
                const controls = window.THREE_CONTROLS;
                const camera = window.THREE_CAMERA;
                if (camera && controls) {
                  gsap.to(camera.position, { x: position.x, y: position.y, z: position.z, duration: 1.5, ease: "power2.inOut" });
                  gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration: 1.5, ease: "power2.inOut", onUpdate: () => controls.update() });
                }
              }
              if (event.data?.type === 'SET_POI') {
                const { position } = event.data;
                if (window.showPOI) window.showPOI(position);
              }
              if (event.data?.type === 'SET_PARAMS') {
                const params = event.data.params;
                if (params && typeof params === 'object') {
                  if (!window.__params) window.__params = {};
                  Object.assign(window.__params, params);
                  window.dispatchEvent(new CustomEvent('paramsUpdated', { detail: params }));
                }
              }
            });

            window.showPOI = (pos) => {
              const scene = window.THREE_SCENE;
              const THREE = window.THREE_INSTANCE;
              if (!scene || !THREE) return;
              
              if (window.activePOI) {
                scene.remove(window.activePOI);
              }

              const dir = new THREE.Vector3(0, -1, 0);
              const origin = new THREE.Vector3(pos.x, pos.y + 2, pos.z);
              const length = 1.2;
              const color = 0x00ffff;
              const headLength = 0.4;
              const headWidth = 0.3;

              const arrowHelper = new THREE.ArrowHelper(dir, origin, length, color, headLength, headWidth);
              arrowHelper.line.material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
              arrowHelper.cone.material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
              
              scene.add(arrowHelper);
              window.activePOI = arrowHelper;

              gsap.to(arrowHelper.position, {
                y: "-=0.5",
                duration: 0.6,
                repeat: 7,
                yoyo: true,
                ease: "sine.inOut",
                onComplete: () => {
                  gsap.to([arrowHelper.line.material, arrowHelper.cone.material], {
                    opacity: 0,
                    duration: 0.5,
                    onComplete: () => {
                      scene.remove(arrowHelper);
                      window.activePOI = null;
                    }
                  });
                }
              });
            };
          })();
        </script>
      `;
      let finalCode = code;
      
      const orbitInitPattern = /new\s+OrbitControls\s*\(\s*camera\s*,\s*renderer\.domElement\s*\)/g;
      if (orbitInitPattern.test(finalCode)) {
        finalCode = finalCode.replace(orbitInitPattern, (match) => {
          return `(window.THREE_CONTROLS = ${match}, window.THREE_CAMERA = camera, window.THREE_CONTROLS)`;
        });
      }

      const sceneInitPattern = /new\s+THREE\.Scene\s*\(\s*\)/g;
      if (sceneInitPattern.test(finalCode)) {
        finalCode = finalCode.replace(sceneInitPattern, (match) => {
          return `(window.THREE_SCENE = ${match}, window.THREE_INSTANCE = THREE, window.THREE_SCENE)`;
        });
      }
      
      if (finalCode.includes('<head>')) {
        finalCode = finalCode.replace('<head>', `<head>${sandboxSetup}`);
      } else {
        finalCode = `<!DOCTYPE html><html><head>${sandboxSetup}</head><body>${finalCode}</body></html>`;
      }
      const blob = new Blob([finalCode], { type: 'text/html' });
      iframeRef.current.src = URL.createObjectURL(blob);
    }
  }, [code, isLightMode]);

  const latestTelemetry = telemetryHistory[telemetryHistory.length - 1]?.values || {};

  return (
    <div className={`relative w-full h-full transition-colors duration-300 ${isLightMode ? 'bg-white' : 'bg-[#020202]'} overflow-hidden`}>
      <iframe
        ref={iframeRef}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full border-none transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        title="STEM Simulation"
        sandbox="allow-scripts allow-modals allow-same-origin"
      />
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[85]">
        {/* Telemetry Panel - Bottom Left */}
        <div className={`absolute bottom-8 left-8 w-64 pointer-events-auto border rounded-2xl overflow-hidden backdrop-blur-3xl shadow-2xl transition-all duration-300 ${
          isLightMode ? 'bg-white/70 border-slate-200' : 'bg-black/40 border-neutral-800'
        }`}>
          <div className={`px-4 py-3 border-b ${isLightMode ? 'border-slate-200' : 'border-white/5'} flex items-center justify-between bg-black/5`}>
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-cyan-500" />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-400' : 'opacity-40'}`}>System Telemetry</span>
            </div>
          </div>
          <div className="p-4 space-y-2.5 max-h-56 overflow-y-auto">
            {Object.keys(latestTelemetry).length > 0 ? (
              Object.entries(latestTelemetry).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center group/item">
                  <span className={`text-[10px] font-mono opacity-50 group-hover/item:opacity-100 transition-opacity uppercase tracking-tighter`}>{key}</span>
                  <span className="text-[11px] font-mono font-bold text-cyan-400 tabular-nums">
                    {typeof val === 'number' ? (val % 1 === 0 ? val : val.toFixed(4)) : val}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-6 opacity-20">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse mb-2" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Waiting for stream...</span>
              </div>
            )}
          </div>
        </div>

        {/* Timeline HUD - Bottom Center */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-[28rem] pointer-events-auto border rounded-2xl overflow-hidden backdrop-blur-3xl shadow-2xl transition-all duration-300 ${
          isLightMode ? 'bg-white/70 border-slate-200' : 'bg-black/40 border-neutral-800'
        }`}>
          <div className="px-5 py-4 space-y-3">
             <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                  <Clock size={12} className="text-cyan-500" />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-400' : 'opacity-40'}`}>Axis T</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <button onClick={() => setTime(0)} className="p-1 hover:text-cyan-500 transition-colors">
                      <RotateCcw size={12} />
                    </button>
                    <button onClick={() => setIsPlaying(!isPlaying)} className={`p-1.5 rounded-lg transition-all ${isLightMode ? 'bg-slate-100 hover:bg-slate-200' : 'bg-white/5 hover:bg-white/10'}`}>
                      {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                </div>
                <span className="text-[11px] font-mono font-bold text-cyan-500 w-12 text-right">{(time * 100).toFixed(1)}%</span>
              </div>
            </div>
            <input 
              type="range" min="0" max="1" step="0.0001" value={time} onChange={(e) => setTime(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800/60 rounded-full appearance-none accent-cyan-500 cursor-pointer pointer-events-auto" 
            />
          </div>
        </div>
      </div>
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-inherit z-[120]">
          <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse text-cyan-500">Connecting Neural Bus...</p>
        </div>
      )}
    </div>
  );
};

export default Visualizer;
