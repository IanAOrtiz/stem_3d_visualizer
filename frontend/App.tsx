
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Message, Subject, TemporalMode, CustomVector } from './types';
import { geminiService } from './services/gemini';
import ChatInterface from './components/ChatInterface';
import Visualizer from './components/Visualizer';
import DraggableInfoBox from './components/DraggableInfoBox';
import SimulationAssistant from './components/SimulationAssistant';
import FeedbackModal from './components/FeedbackModal';
import { INITIAL_MESSAGE } from './constants';
import { RefreshCw, MessageSquare, MessageSquareOff, Bot, Sun, Moon, Database, Terminal, BookOpen } from 'lucide-react';

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
      content: `ARCHITECT_TERMINAL: Booting system... Initial source code loaded.\n\n\`\`\`html\n${REFERENCE_VISUALIZATION}\n\`\`\``, 
      timestamp: new Date() 
    },
  ]);
  const [hubMessages, setHubMessages] = useState<Message[]>([
    { id: 'h1', role: 'assistant', content: INITIAL_MESSAGE, timestamp: new Date() },
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeCode, setActiveCode] = useState<string>(REFERENCE_VISUALIZATION);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
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
  const [customVectors, setCustomVectors] = useState<CustomVector[]>([]);
  const [telemetry, setTelemetry] = useState<Record<string, string>>({});
  const [lastUserIntent, setLastUserIntent] = useState<string>("");
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [mode, setMode] = useState<'generate' | 'library'>('generate');

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

  const extractCode = (text: string) => {
    const codeMatch = text.match(/```(?:html|javascript|threejs|js)?\s*([\s\S]*?)```/i);
    if (codeMatch) return codeMatch[1].trim();
    const lower = text.toLowerCase();
    const dIdx = lower.indexOf('<!doctype');
    const hIdx = lower.indexOf('<html');
    const start = dIdx !== -1 ? dIdx : (hIdx !== -1 ? hIdx : -1);
    if (start !== -1) {
      const endIdx = lower.lastIndexOf('</html>');
      return text.substring(start, endIdx !== -1 ? endIdx + 7 : undefined).trim();
    }
    return null;
  };

  const parseMetadata = (text: string) => {
    const match = text.match(/\[METADATA\]\s*([\s\S]*?)\s*\[\/METADATA\]/i);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.error("Metadata parsing failed", e);
      }
    }
    return null;
  };

  const handleTerminalSendMessage = async (text: string, image?: { data: string, mimeType: string }) => {
    if (isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setTerminalMessages(prev => [...prev, userMsg]);
    setLastUserIntent(text);
    setIsLoading(true);

    // Library Mode: fetch catalog, let Gemini pick best match by key then description.
    // If match found, render directly. If no match, fall through to generate pipeline.
    if (mode === 'library') {
      console.log(`[APP] Library mode active. Fetching catalog...`);
      let libraryHit = false;
      try {
        const catalogRes = await fetch(`https://letter-dvds-gender-bold.trycloudflare.com/snippets/catalog`);
        if (catalogRes.ok) {
          const catalog = await catalogRes.json();
          console.log(`[APP] Catalog loaded: ${catalog.length} entries`);
          const matchedKey = await geminiService.sendLibraryMatch(text.trim(), catalog);
          if (matchedKey) {
            const snippetRes = await fetch(`https://letter-dvds-gender-bold.trycloudflare.com/snippets/key/${encodeURIComponent(matchedKey)}`);
            if (snippetRes.ok) {
              const snippet = await snippetRes.json();
              console.log(`[APP] Library HIT — rendering snippet "${snippet.key}"`);
              setActiveCode(snippet.code);
              setTerminalMessages(prev => [...prev, {
                id: Date.now().toString(), role: 'assistant',
                content: `LIBRARY_LOAD: Matched snippet "${snippet.key}" for intent "${text.trim()}". Rendered directly from database.`, timestamp: new Date()
              }]);
              libraryHit = true;
            }
          }
          if (!libraryHit) {
            console.log(`[APP] Library MISS — Gemini found no confident match`);
            setTerminalMessages(prev => [...prev, {
              id: Date.now().toString(), role: 'assistant',
              content: `LIBRARY_FALLBACK: No verified snippet matches "${text.trim()}". Falling back to generate pipeline...`, timestamp: new Date()
            }]);
          }
        } else {
          console.log(`[APP] Library MISS — catalog fetch failed`);
          setTerminalMessages(prev => [...prev, {
            id: Date.now().toString(), role: 'assistant',
            content: `LIBRARY_FALLBACK: Could not load catalog. Falling back to generate pipeline...`, timestamp: new Date()
          }]);
        }
      } catch (e) {
        console.warn(`[APP] Library fetch error — falling back to generate pipeline`, e);
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(), role: 'assistant',
          content: "LIBRARY_FALLBACK: Could not reach backend. Falling back to generate pipeline...", timestamp: new Date()
        }]);
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
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }]
      }));

      // Step 1: Generate and validate a scene plan, then explain it.
      console.log(`[APP] Step 1: Starting planner pipeline...`);
      let planResult: { canonicalScenePlan: any; explanation: string } | null = null;
      try {
        planResult = await geminiService.generateValidatedScenePlan(text);
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `SCENE_PLAN_VALIDATED: ${JSON.stringify(planResult.canonicalScenePlan.parameters)}\n\nEXPLANATION: ${planResult.explanation}`,
          timestamp: new Date()
        }]);
      } catch (e: any) {
        console.error("Planner failed:", e.message);
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `PLANNER_BYPASS: ${e.message}. Proceeding with intent only.`,
          timestamp: new Date()
        }]);
      }

      // Step 2: Pass intent + validated scene plan + explanation to the architect.
      console.log(`[APP] Step 2: Sending to architect. Plan available: ${!!planResult}`);
      const architectMessage = planResult
        ? `${text}\n\nVALIDATED_SCENE_PLAN:\n${JSON.stringify(planResult.canonicalScenePlan, null, 2)}\n\nSCENE_EXPLANATION:\n${planResult.explanation}`
        : text;

      console.log(`[APP] Calling architect with message (${architectMessage.length} chars)...`);
      const response = await geminiService.sendArchitectMessage(history, architectMessage, activeCode, image);
      const content = response.text || "";
      console.log(`[APP] Architect responded (${content.length} chars)`);
      
      if (content.includes("CONCEPTUAL_QUERY:")) {
        console.log(`[APP] Conceptual query detected — aborting pipeline`);
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "LOG: Input detected as conceptual. Architectural refinement aborted. Consult the Spaide Assistant for scientific analysis.",
          timestamp: new Date()
        }]);
        setIsLoading(false);
        return;
      }

      const htmlCode = extractCode(content);
      const metadata = parseMetadata(content);
      console.log(`[APP] Extraction — code: ${!!htmlCode} (${htmlCode?.length || 0} chars), metadata: ${!!metadata}`);

      if (htmlCode) {
        setActiveCode(htmlCode);
        if (metadata) setCurrentMetadata(metadata);
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: content,
          timestamp: new Date()
        }]);

        // Auto-validate artifact
        if (currentMetadata) {
          try {
            await fetch("https://letter-dvds-gender-bold.trycloudflare.com/artifacts/validate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key: currentMetadata.key,
                description: currentMetadata.description,
                code: htmlCode,
                tags: currentMetadata.tags,
                intent: text,
              }),
            });
          } catch (e) {
            console.error("Validation failed:", e);
          }
        }
      } else {
        setTerminalMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: content || "ERROR: Extraction failure. The architectural core failed to resolve a valid Three.js payload.", 
          timestamp: new Date() 
        }]);
      }
    } catch (e) {
      console.error(e);
      setTerminalMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "CRITICAL_FAILURE: Architectural node offline. Check network connectivity.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyRefinement = async (prompt: string) => {
    setIsLoading(true);
    setIsChatVisible(true);
    setLastUserIntent(prompt);
    setTerminalMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: `SYSTEM_PATCH_REQUEST: ${prompt}`, timestamp: new Date() }]);
    try {
      const response = await geminiService.applyEdit(activeCode, prompt);
      const content = response.text || "";
      const htmlCode = extractCode(content);
      const metadata = parseMetadata(content);

      if (htmlCode) {
        setActiveCode(htmlCode);
        if (metadata) setCurrentMetadata(metadata);
        setTerminalMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: content || "PATCH_APPLIED: Source synchronized.", 
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
      const res = await fetch(
        "https://letter-dvds-gender-bold.trycloudflare.com/artifacts/feedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: currentMetadata.key,
            description: currentMetadata.description,
            code: activeCode,
            tags: currentMetadata.tags,
            intent: lastUserIntent,
            feedback,
            reason,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `FEEDBACK_RECORDED: Quality marked as "${feedback}". ${feedback === 'good' ? `Snippet "${currentMetadata.key}" saved to library.` : 'Artifact logged for analysis.'} Hash: ${data.sceneHash?.substring(0, 8)}...`,
          timestamp: new Date()
        }]);
      } else {
        const err = await res.json();
        setTerminalMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `FEEDBACK_FAILED: ${err.error || "Unknown error"}`,
          timestamp: new Date()
        }]);
      }
    } catch (e) {
      console.error(e);
      setTerminalMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "FEEDBACK_FAILED: Could not reach backend.",
        timestamp: new Date()
      }]);
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'bg-[#020202] text-white' : 'bg-white text-slate-900'}`}>
      <div className={`transition-all duration-500 ease-in-out ${isChatVisible ? 'w-[440px]' : 'w-0'} overflow-hidden border-r border-white/5 relative`}>
        <div className="w-[440px] h-full">
          <ChatInterface messages={terminalMessages} onSendMessage={handleTerminalSendMessage} onApplyEdit={handleApplyRefinement} isLoading={isLoading} isLightMode={theme === 'light'} placeholder={mode === 'library' ? 'Enter snippet key...' : undefined} />
        </div>
      </div>

      <main className="flex-1 relative">
        <Visualizer 
          code={activeCode} isLightMode={theme === 'light'} time={globalTime} setTime={setGlobalTime}
          isPlaying={isPlaying} setIsPlaying={setIsPlaying} playbackRate={playbackRate} setPlaybackRate={setPlaybackRate}
          metadata={currentMetadata ? { title: currentMetadata.key, description: currentMetadata.description, subject: 'Physics', temporalMode: 'Transient' } : undefined} customVectors={customVectors} setCustomVectors={setCustomVectors}
          onTelemetryUpdate={setTelemetry}
        />
        
        <div className="absolute top-6 left-6 z-[90] flex items-center gap-3">
           <button 
             onClick={() => setIsChatVisible(!isChatVisible)} 
             className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl border transition-all backdrop-blur-xl shadow-2xl ${
               isChatVisible 
               ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' 
               : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
             }`}
           >
            <Terminal size={18} />
            <span className="font-bold uppercase tracking-widest text-[10px]">{isChatVisible ? 'Close Terminal' : 'Architect Terminal'}</span>
          </button>
        </div>

        <div className="absolute top-6 right-6 flex items-center gap-3 z-[90]">
           <button
             onClick={() => setMode(mode === 'generate' ? 'library' : 'generate')}
             className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl border transition-all backdrop-blur-xl shadow-2xl ${
               mode === 'library'
               ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
               : 'bg-black/40 border-white/10 text-neutral-400 hover:text-white'
             }`}
           >
            <BookOpen size={18} />
            <span className="font-bold uppercase tracking-widest text-[10px]">{mode === 'library' ? 'Library Mode' : 'Generate Mode'}</span>
           </button>
           <button
             onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
             className={`p-3.5 rounded-2xl border border-white/10 bg-black/40 text-neutral-400 hover:text-white transition-all backdrop-blur-xl shadow-2xl`}
           >
            {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-fuchsia-500" />}
           </button>
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
            <span className="font-bold uppercase tracking-widest text-[10px]">{isAssistantOpen ? 'Active Assistant' : 'Spaide Assistant'}</span>
          </button>
        </div>
        
        <SimulationAssistant
          isOpen={isAssistantOpen} activeCode={activeCode} metadata={currentMetadata}
          customVectors={customVectors} onClose={() => setIsAssistantOpen(false)} isLightMode={theme === 'light'}
          messages={hubMessages} setMessages={setHubMessages} onApplyEdit={handleApplyRefinement}
          isLoading={isLoading} setTime={setGlobalTime} setIsPlaying={setIsPlaying}
          onCameraUpdate={handleCameraUpdate}
          onHighlightPoint={handleHighlightPoint}
        />
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
