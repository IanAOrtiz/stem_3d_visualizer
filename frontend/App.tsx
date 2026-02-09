
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Message, CustomVector } from './types';
import * as api from './services/api';
import ChatInterface from './components/ChatInterface';
import Visualizer from './components/Visualizer';
import SimulationAssistant from './components/SimulationAssistant';
import FeedbackModal from './components/FeedbackModal';
import { INITIAL_MESSAGE } from './constants';
import { Bot, Database, Terminal } from 'lucide-react';

const REFERENCE_VISUALIZATION = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; overflow: hidden; background: transparent; }
        #canvas-container { width: 100%; height: 100%; }
    </style>
</head>
<body>
    <div id="canvas-container"></div>
    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

        let scene, camera, renderer, controls;
        const GRID_SIZE = 40;
        
        window.renderFrame = function(t) {
            console.log(\`TELEMETRY: Uptime = \${(performance.now() / 1000).toFixed(2)}\`);
        };

        function init() {
            const isLight = getComputedStyle(document.body).backgroundColor.includes('253') || getComputedStyle(document.body).backgroundColor.includes('255');
            const bgColor = new THREE.Color(getComputedStyle(document.body).backgroundColor);
            const gridColor = isLight ? 0xcccccc : 0x111111;

            scene = new THREE.Scene();
            scene.background = bgColor;

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(20, 20, 20);
            
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.getElementById('canvas-container').appendChild(renderer.domElement);
            
            controls = new OrbitControls(camera, renderer.domElement);
            window.THREE_CONTROLS = controls; 
            window.THREE_CAMERA = camera;
            controls.enableDamping = true;

            const grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, gridColor, gridColor);
            scene.add(grid);

            const light = new THREE.PointLight(0xffffff, 2);
            light.position.set(10, 20, 10);
            scene.add(light);
            scene.add(new THREE.AmbientLight(0x444444));

            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });

            console.log("SYSTEM_HEARTBEAT: Scene Initialized");
            animate();
        }

        function animate() {
            requestAnimationFrame(animate);
            if (controls) controls.update();
            if (renderer && scene && camera) renderer.render(scene, camera);
        }

        window.addEventListener('load', init);
    </script>
</body>
</html>
`;

const App: React.FC = () => {
  const [terminalMessages, setTerminalMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: 'VISUALIZATION_CREATOR: Type what you want to visualize.', 
      timestamp: new Date() 
    },
  ]);
  const [hubMessages, setHubMessages] = useState<Message[]>([
    { id: 'h1', role: 'assistant', content: INITIAL_MESSAGE, timestamp: new Date() },
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeCode, setActiveCode] = useState<string>(REFERENCE_VISUALIZATION);
  const theme: 'dark' = 'dark';
  const [currentMetadata, setCurrentMetadata] = useState<{ key: string; description: string; code: string; tags: string[] } | null>({
    key: "system_standby_node",
    description: "Core visualization node is currently in idle mode. Awaiting scientific parameters or visual reference for structural instantiation.",
    code: REFERENCE_VISUALIZATION,
    tags: ["standby", "initial"]
  });
  const [globalTime, setGlobalTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [queuedExplainerPrompt, setQueuedExplainerPrompt] = useState<string | null>(null);
  const [customVectors, setCustomVectors] = useState<CustomVector[]>([]);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [mode] = useState<'generate' | 'library'>('library');
  const [currentScenePlan, setCurrentScenePlan] = useState<any | null>(null);
  const [currentSceneHash, setCurrentSceneHash] = useState<string | null>(null);
  const visualizerIframeRef = useRef<HTMLIFrameElement>(null);
  const architectAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    const loop = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        setGlobalTime(prev => (prev + (delta * playbackRate) / 20) % 1);
      }
      lastTime = now;
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, playbackRate]);

  useEffect(() => {
    return () => {
      architectAbortControllerRef.current?.abort();
      architectAbortControllerRef.current = null;
    };
  }, []);

  const handleCameraUpdate = (cameraData: { position: { x: number, y: number, z: number }, target: { x: number, y: number, z: number } }) => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'SET_CAMERA', ...cameraData }, '*');
    }
  };

  const handleHighlightPoint = (target: { x: number, y: number, z: number }) => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'SET_POI', position: target }, '*');
    }
  };

  const handleTerminalSendMessage = async (text: string, image?: { data: string, mimeType: string }) => {
    if (isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setTerminalMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    const controller = new AbortController();
    architectAbortControllerRef.current = controller;

    // Library Mode: Mastra library workflow handles catalog fetch, match, and snippet retrieval.
    // If match found, render directly. If no match, fall through to generate pipeline.
    if (mode === 'library') {
      console.log(`[APP] Library mode active. Running library workflow...`);
      let libraryHit = false;
      try {
        const result = await api.libraryLookup(text.trim(), controller.signal);
        if (result.found && result.code) {
          console.log(`[APP] Library HIT — rendering snippet "${result.key}"`);
          setActiveCode(result.code);
          setCurrentSceneHash(result.sceneHash || null);
          setCurrentScenePlan(null);
          setTerminalMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Loaded "${text.trim()}"`,
            actionButton: {
              label: 'Explain what I\u2019m looking at',
              prompt: "explain what i'm looking at"
            },
            timestamp: new Date()
          }]);
          libraryHit = true;
        } else {
          console.log(`[APP] Library MISS — ${result.reason}`);
        // Suppress library fallback message in the Visualization Creator UI.
        }
      } catch (e) {
        console.warn(`[APP] Library workflow error — falling back to generate pipeline`, e);
        // Suppress library fallback message in the Visualization Creator UI.
      }
      if (libraryHit) {
        console.log(`[APP] Library mode complete — skipping generate pipeline`);
        setIsLoading(false);
        return;
      }
      console.log(`[APP] Library mode fallthrough → entering generate pipeline`);
    }

    try {
      const history = terminalMessages.slice(-5).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.content,
      }));

      // Full generate pipeline via Mastra workflow (plan → validate → explain → coherence → architect)
      console.log(`[APP] Starting generate workflow...`);
      const result = await api.generateVisualization(text, activeCode, history, image, controller.signal);
      console.log(`[APP] Generate workflow complete. Code: ${result.code?.length || 0} chars`);

      if (result.scenePlan) {
        setCurrentScenePlan(result.scenePlan);
      }

      const code = result.code;
      if (code && !code.includes("CONCEPTUAL_QUERY:")) {
        setActiveCode(code);
        if (result.metadata) setCurrentMetadata(result.metadata);
        if (result.explanation) {
          setTerminalMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: result.explanation,
            actionButton: {
              label: 'Explain what I\u2019m looking at',
              prompt: "explain what i'm looking at"
            },
            timestamp: new Date()
          }]);
        }

        // Auto-validate artifact
        if (result.scenePlan) {
          try {
            const artifact = await api.storeArtifact({
              scenePlan: result.scenePlan,
              renderCode: code,
              intent: text,
              modelExplanation: result.explanation,
              schemaVersion: result.scenePlan.schemaVersion || 'artifact_v1',
              modelVersion: 'mastra_generate_pipeline_v1',
              promptVersion: 'generate_workflow_v1',
            });
            if (artifact?.sceneHash) {
              setCurrentSceneHash(artifact.sceneHash);
            }
          } catch (e) {
            console.error("Validation failed:", e);
          }
        }
      } else if (code?.includes("CONCEPTUAL_QUERY:")) {
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "LOG: Input detected as conceptual. Architectural refinement aborted. Consult the Visualization Explainer for scientific analysis.",
          timestamp: new Date()
        }]);
      } else {
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "ERROR: Extraction failure. The architectural core failed to resolve a valid Three.js payload.",
          timestamp: new Date()
        }]);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'ARCHITECT_CANCELLED: Generation pipeline was cancelled.',
          timestamp: new Date()
        }]);
        return;
      }
      console.error(e);
      setTerminalMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "CRITICAL_FAILURE: Architectural node offline. Check network connectivity.", timestamp: new Date() }]);
    } finally {
      architectAbortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleCancelArchitectProcess = useCallback(() => {
    architectAbortControllerRef.current?.abort();
    architectAbortControllerRef.current = null;
  }, []);

  const handleApplyRefinement = async (prompt: string) => {
    setIsLoading(true);
    setIsChatVisible(true);
    setTerminalMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: `SYSTEM_PATCH_REQUEST: ${prompt}`, timestamp: new Date() }]);
    try {
      if (!currentSceneHash) {
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'PATCH_BLOCKED: Missing parent scene hash. Save or load a tracked artifact before applying update patches.',
          timestamp: new Date()
        }]);
        return;
      }

      const history = terminalMessages.slice(-5).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.content,
      }));

      const result = await api.updateVisualization(
        prompt,
        currentSceneHash,
        activeCode,
        history,
        false,
      );
      const code = result.code;

      if (result.scenePlan) {
        setCurrentScenePlan(result.scenePlan);
      }

      if (code && !code.includes("CONCEPTUAL_QUERY:")) {
        setActiveCode(code);
        if (result.metadata) setCurrentMetadata(result.metadata);

        try {
          if (result.scenePlan) {
            const artifact = await api.storeArtifact({
              scenePlan: result.scenePlan,
              parentSceneHash: result.parentSceneHash || currentSceneHash,
              renderCode: code,
              intent: prompt,
              modelExplanation: result.explanation || "refinement_edit",
              schemaVersion: result.scenePlan.schemaVersion || 'artifact_v1',
              modelVersion: 'mastra_update_workflow_v1',
              promptVersion: 'refinement_update_workflow_v1',
              updateClassification: result.updateClassification,
            });
            if (artifact?.sceneHash) {
              setCurrentSceneHash(artifact.sceneHash);
            }
          }
        } catch (e) {
          console.error("Artifact store failed on refinement:", e);
        }

        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `PATCH_APPLIED: Refinement executed via update workflow (${result.updateClassification}).\n\nEXPLANATION: ${result.explanation || 'No explanation returned.'}`,
          timestamp: new Date()
        }]);
      } else {
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "PATCH_FAILED: Refinement did not produce executable visualization code.",
          timestamp: new Date()
        }]);
      }
    } catch (e) {
      console.error(e);
      setTerminalMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "PATCH_FAILED: Synchronization error.", timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const handleFeedbackSubmit = async (feedback: 'good' | 'bad', reason: string) => {
    if (!activeCode || !currentMetadata) return;

    try {
      const data = await api.submitFeedback({
        sceneHash: currentSceneHash || undefined,
        scenePlan: currentScenePlan || undefined,
        renderCode: activeCode,
        schemaVersion: currentScenePlan?.schemaVersion || 'artifact_v1',
        key: currentMetadata.key,
        description: currentMetadata.description,
        code: activeCode,
        tags: currentMetadata.tags,
        feedback,
        reason,
      });
      setTerminalMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `FEEDBACK_RECORDED: Quality marked as "${feedback}". ${feedback === 'good' ? `Snippet "${currentMetadata.key}" saved to library.` : 'Artifact logged for analysis.'} Hash: ${data.sceneHash?.substring(0, 8)}...`,
        timestamp: new Date()
      }]);
    } catch (e: any) {
      console.error(e);
      setTerminalMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `FEEDBACK_FAILED: ${e.message || "Could not reach backend."}`,
        timestamp: new Date()
      }]);
    }
  };

  const handleCommitParameterPatch = async (parameterPatch: Record<string, number>) => {
    if (isLoading) return;
    if (!currentSceneHash || !currentScenePlan) {
      setTerminalMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'PARAM_PATCH_BLOCKED: Missing active scene hash or scene plan.',
        timestamp: new Date(),
      }]);
      return;
    }

    const patchEntries = Object.entries(parameterPatch);
    if (patchEntries.length === 0) return;

    setIsLoading(true);

    const patchSummary = patchEntries
      .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(4) : String(v)}`)
      .join(', ');
    const intent = `Apply parameter patch: ${patchSummary}`;

    setTerminalMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: `PARAM_PATCH_REQUEST: ${patchSummary}`,
      timestamp: new Date(),
    }]);

    try {
      const history = terminalMessages.slice(-5).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.content,
      }));

      const result = await api.updateVisualization(
        intent,
        currentSceneHash,
        activeCode,
        history,
        false,
        parameterPatch,
      );

      const code = result.code;
      if (result.scenePlan) {
        setCurrentScenePlan(result.scenePlan);
      }

      if (code && !code.includes('CONCEPTUAL_QUERY:')) {
        setActiveCode(code);
        if (result.metadata) setCurrentMetadata(result.metadata);

        try {
          if (result.scenePlan) {
            const artifact = await api.storeArtifact({
              scenePlan: result.scenePlan,
              parentSceneHash: result.parentSceneHash || currentSceneHash,
              renderCode: code,
              intent,
              modelExplanation: result.explanation || 'parameter_patch',
              schemaVersion: result.scenePlan.schemaVersion || 'artifact_v1',
              modelVersion: 'mastra_update_workflow_v1',
              promptVersion: 'parameter_controls_commit_v1',
              updateClassification: result.updateClassification,
            });
            if (artifact?.sceneHash) {
              setCurrentSceneHash(artifact.sceneHash);
            }
          }
        } catch (e) {
          console.error('Artifact store failed on parameter patch:', e);
        }

        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `PARAM_PATCH_APPLIED: ${patchSummary}\n\nUpdate path: ${result.updateClassification}`,
          timestamp: new Date(),
        }]);
      } else {
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'PARAM_PATCH_FAILED: Update workflow did not return executable code.',
          timestamp: new Date(),
        }]);
      }
    } catch (e) {
      console.error(e);
      setTerminalMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'PARAM_PATCH_FAILED: Could not apply parameter patch.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'bg-[#020202] text-white' : 'bg-white text-slate-900'}`}>
      <div
        className="absolute top-1/2 -translate-y-1/2 z-[95] transition-[left] duration-500 ease-in-out"
        style={{ left: isChatVisible ? '440px' : '0px', transform: 'translate(50%, -50%)' }}
      >
        <button 
          onClick={() => setIsChatVisible(!isChatVisible)} 
          className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-2xl backdrop-blur-xl ${
            isChatVisible
              ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
              : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
          }`}
          title={isChatVisible ? 'Close Creator' : 'Open Creator'}
        >
          <Terminal size={18} />
        </button>
      </div>
      <div className={`transition-all duration-500 ease-in-out ${isChatVisible ? 'w-[440px]' : 'w-0'} overflow-hidden border-r border-white/5 relative`}>
        <div className="w-[440px] h-full">
          <ChatInterface
            messages={terminalMessages}
            onSendMessage={handleTerminalSendMessage}
            onApplyEdit={handleApplyRefinement}
            onCancelProcess={handleCancelArchitectProcess}
            onMessageAction={(prompt) => {
              setIsAssistantOpen(true);
              setQueuedExplainerPrompt(prompt);
            }}
            isLoading={isLoading}
            isLightMode={theme === 'light'}
            placeholder="Type what you want to visualize"
          />
        </div>
      </div>

      <main className="flex-1 relative">
        <Visualizer
          code={activeCode} isLightMode={theme === 'light'} time={globalTime} setTime={setGlobalTime}
          isPlaying={isPlaying} setIsPlaying={setIsPlaying} playbackRate={playbackRate} setPlaybackRate={setPlaybackRate}
          metadata={currentMetadata ? { title: currentMetadata.key, description: currentMetadata.description, subject: 'Physics', temporalMode: 'Transient' } : undefined} customVectors={customVectors} setCustomVectors={setCustomVectors}
          iframeRef={visualizerIframeRef}
          initialParams={currentScenePlan?.parameters}
          isGenerating={isLoading}
        />
        

        <div className="absolute top-6 right-6 flex items-center gap-3 z-[90]">
           <button
             onClick={() => setIsFeedbackModalOpen(true)}
             className="p-3.5 rounded-2xl border border-white/10 bg-black/40 text-neutral-400 hover:text-white transition-all backdrop-blur-xl shadow-2xl"
           >
            <Database size={18} className="text-emerald-500" />
           </button>
           <button onClick={() => setIsAssistantOpen(!isAssistantOpen)} className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl border transition-all backdrop-blur-xl shadow-2xl ${
             isAssistantOpen 
             ? 'bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-400' 
             : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
           }`}>
            <Bot size={18} />
            <span className="font-bold uppercase tracking-widest text-[10px]">{isAssistantOpen ? 'Active Explainer' : 'Visualization Explainer'}</span>
          </button>
        </div>
        
        <SimulationAssistant
          isOpen={isAssistantOpen} activeCode={activeCode} metadata={currentMetadata}
          customVectors={customVectors} onClose={() => setIsAssistantOpen(false)} isLightMode={theme === 'light'}
          messages={hubMessages} setMessages={setHubMessages} onApplyEdit={handleApplyRefinement}
          isLoading={isLoading} setTime={setGlobalTime} setIsPlaying={setIsPlaying}
          onCameraUpdate={handleCameraUpdate}
          onHighlightPoint={handleHighlightPoint}
          queuedPrompt={queuedExplainerPrompt}
          onQueuedPromptHandled={() => setQueuedExplainerPrompt(null)}
        />

        {/* Parameter controls hidden for now */}
      </main>

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSubmit={handleFeedbackSubmit}
        isLightMode={theme === 'light'}
      />
    </div>
  );
};

export default App;
