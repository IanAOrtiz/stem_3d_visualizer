
import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

const tutorTools: FunctionDeclaration[] = [
  {
    name: 'updateSimulationTime',
    parameters: {
      type: Type.OBJECT,
      description: 'Adjust the simulation timeline (t) to a specific frame of interest (0.0 to 1.0).',
      properties: {
        t: {
          type: Type.NUMBER,
          description: 'The target time value from 0.0 (start) to 1.0 (end).',
        },
      },
      required: ['t'],
    },
  },
  {
    name: 'adjustCamera',
    parameters: {
      type: Type.OBJECT,
      description: 'Request the CameraMan to reframe the view to focus on a specific component.',
      properties: {
        intent: {
          type: Type.STRING,
          description: 'A description of what needs to be visible (e.g., "Zoom into the top of the pendulum").',
        },
      },
      required: ['intent'],
    },
  },
  {
    name: 'highlightArea',
    parameters: {
      type: Type.OBJECT,
      description: 'Point a visual indicator (arrow) at a specific component to draw the user\'s attention without moving the camera.',
      properties: {
        intent: {
          type: Type.STRING,
          description: 'A description of what to point at (e.g., "The pivot point of the pendulum").',
        },
      },
      required: ['intent'],
    },
  }
];

export class GeminiService {
  /**
   * ARCHITECT ROLE: Strictly for direct visualization updates and new generation.
   */
  async sendArchitectMessage(
    history: { role: 'user' | 'model', parts: { text: string }[] }[], 
    message: string,
    currentCode: string,
    image?: { data: string, mimeType: string }
  ) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-pro-preview';

    const systemPrompt = SYSTEM_INSTRUCTION + `
    ROLE: LEAD ARCHITECT.
    STRICT RULES:
    1. Your ONLY purpose is to update or generate the 3D visualization code.
    2. Output the complete updated HTML code block IMMEDIATELY.
    3. Use triple backticks with 'html' specifier.
    4. If query is purely conceptual, respond with: "CONCEPTUAL_QUERY: Refinement unnecessary. Consult Spaide Assistant for theoretical analysis."
    `;

    const lastParts: any[] = [{ text: `CURRENT CODE:\n${currentCode}\n\nUSER_COMMAND: ${message}` }];
    if (image) {
      lastParts.unshift({ inlineData: { data: image.data, mimeType: image.mimeType } });
    }

    const contents = [
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      { role: 'user' as const, parts: lastParts }
    ];

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1
      }
    });
    return response;
  }

  /**
   * TUTOR ROLE: For scientific explanations and "what if" scenarios in the Spaide Assistant.
   */
  async sendTutorMessage(
    history: { role: 'user' | 'model', parts: { text: string }[] }[], 
    message: string,
    currentCode: string
  ) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-pro-preview';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: `CURRENT SIMULATION CONTEXT:\n${currentCode}\n\nUSER QUESTION: ${message}` }] }
      ],
      config: {
        systemInstruction: `
        ROLE: MASTER STEM TUTOR (SPAIDE ASSISTANT).
        PRIMARY OBJECTIVE: Provide rigorous scientific explanations using LaTeX.
        
        STRICT ARCHITECTURAL HANDOFF PROTOCOL:
        1. YOU ARE EXPRESSLY FORBIDDEN FROM GENERATING FULL HTML, JAVASCRIPT, OR THREE.JS CODE BLOCKS.
        2. If the user asks for a modification, addition, or change to the visualization, you MUST NOT write the code. Instead, write a detailed technical prompt for the Architect Terminal and wrap it in [SUGGESTED_EDIT] tags.
        3. Your [SUGGESTED_EDIT] prompt should be highly specific: "Add a second pendulum with mass m=2 and length L=1.5, connected to the same pivot point."
        4. Use highlightArea(intent) to point at components you are explaining.
        5. Use adjustCamera(intent) to reframe the view.
        `,
        tools: [{ functionDeclarations: tutorTools }],
        temperature: 0.7,
      },
    });

    return response;
  }

  /**
   * CAMERAMAN ROLE: Pure spatial reasoning for Three.js viewports.
   */
  async sendCameraManMessage(intent: string, currentCode: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        { role: 'user', parts: [{ text: `
          ROLE: CAMERAMAN.
          INTENT: "${intent}"
          SOURCE CODE:
          ${currentCode}

          TASK: Calculate THREE.Vector3 for camera position and orbit target based on source geometry.
          OUTPUT: Return JSON only.
        ` }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            position: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                z: { type: Type.NUMBER }
              },
              required: ["x", "y", "z"]
            },
            target: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                z: { type: Type.NUMBER }
              },
              required: ["x", "y", "z"]
            }
          },
          required: ["position", "target"]
        }
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      return null;
    }
  }

  async applyEdit(currentCode: string, editPrompt: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-pro-preview';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: `SOURCE:\n${currentCode}\n\nARCHITECT_PROMPT: ${editPrompt}` }]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\nReturn ONLY the full updated HTML block within triple backticks.",
        temperature: 0.1,
      }
    });

    return response;
  }

  // The schema shape the planner must conform to. Single source for the prompt.
  private static SCENE_PLAN_SCHEMA = {
    concept: "harmonic_oscillator",
    schemaVersion: "v1",
    parameters: {
      amplitude: "number, required (alias: A). Must be > 0.",
      frequency: "number, required (alias: f). Must be > 0.",
      phase: "number, optional. Defaults to 0.",
    },
  };

  /**
   * PLANNER ROLE: Converts user intent into a structured scene plan.
   * Returns a JSON object conforming to harmonic_oscillator.v1 schema.
   */
  async sendPlannerMessage(intent: string, previousErrors: string[] = []) {
    console.log(`[PLANNER] Generating scene plan for intent: "${intent}"`);
    if (previousErrors.length > 0) console.log(`[PLANNER] Retrying with previous errors:`, previousErrors);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';

    let promptText = `USER INTENT: "${intent}"\n\nSCHEMA:\n${JSON.stringify(GeminiService.SCENE_PLAN_SCHEMA, null, 2)}`;
    if (previousErrors.length > 0) {
      promptText += `\n\nYour previous output failed validation with these errors:\n${previousErrors.map(e => `- ${e}`).join('\n')}\nFix your output accordingly.`;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        systemInstruction: `ROLE: SCENE PLANNER.
You convert user intent into a structured scene plan JSON object for a harmonic oscillator visualization.
Output ONLY the JSON object with fields: concept, schemaVersion, parameters.
concept must be "harmonic_oscillator". schemaVersion must be "v1".
parameters must include amplitude (> 0) and frequency (> 0). phase is optional (defaults to 0).
Derive physically meaningful values from the user's intent.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concept: { type: Type.STRING },
            schemaVersion: { type: Type.STRING },
            parameters: {
              type: Type.OBJECT,
              properties: {
                amplitude: { type: Type.NUMBER },
                frequency: { type: Type.NUMBER },
                phase: { type: Type.NUMBER },
              },
              required: ["amplitude", "frequency"],
            },
          },
          required: ["concept", "schemaVersion", "parameters"],
        },
      },
    });

    try {
      const parsed = JSON.parse(response.text);
      console.log(`[PLANNER] Raw plan output:`, parsed);
      return parsed;
    } catch (e) {
      console.error(`[PLANNER] Failed to parse response:`, response.text);
      return null;
    }
  }

  /**
   * Validate a candidate scene plan via the backend API.
   */
  private async validatePlanViaBackend(candidate: any): Promise<{ valid: boolean; errors: string[]; canonicalScenePlan?: any }> {
    console.log(`[VALIDATOR] Sending plan to backend for validation...`);
    const res = await fetch("https://letter-dvds-gender-bold.trycloudflare.com/validate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenePlan: candidate }),
    });
    const result = await res.json();
    console.log(`[VALIDATOR] Backend response — valid: ${result.valid}`, result.valid ? result.canonicalScenePlan : result.errors);
    return result;
  }

  /**
   * PLANNER ROLE (continued): Generates a pedagogical explanation of the scene.
   * Called after validation succeeds, using the same Flash model.
   */
  async sendPlannerExplanation(intent: string, canonicalScenePlan: any): Promise<string> {
    console.log(`[EXPLANATION] Generating explanation for validated plan...`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{
        role: 'user',
        parts: [{ text: `USER INTENT: "${intent}"\n\nVALIDATED SCENE PLAN:\n${JSON.stringify(canonicalScenePlan, null, 2)}` }]
      }],
      config: {
        systemInstruction: `ROLE: SCENE PLANNER — EXPLANATION PHASE.
You are explaining a 3D STEM visualization that is about to be built.
Given the user's intent and the validated scene plan, write a concise explanation covering:
1. THE IDEA: What scientific concept this scene communicates.
2. THE FEEL: What the learner is supposed to notice and feel when watching the visualization.
3. THE VISION: A concrete description of what the visual should look like in motion.
4. MISCONCEPTION GUARD: What common misconception this visualization helps avoid, and how.

Be specific to the parameters. Reference actual values (amplitude, frequency, phase) and describe what they produce visually.
Keep it under 150 words. No code. No markdown headers. Just clear, direct prose.`,
        temperature: 0.7,
      },
    });

    const explanation = response.text || "";
    console.log(`[EXPLANATION] Generated (${explanation.length} chars):`, explanation.slice(0, 120) + "...");
    return explanation;
  }

  /**
   * COHERENCE VALIDATOR: Judges whether intent, scene plan, and explanation
   * form a coherent triangle. Does NOT generate content — only classifies.
   */
  async sendCoherenceCheck(
    intent: string,
    canonicalScenePlan: any,
    explanation: string
  ): Promise<{ coherent: boolean; reason: string }> {
    console.log(`[COHERENCE] Checking coherence triangle...`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{
        role: 'user',
        parts: [{ text: `USER INTENT: "${intent}"\n\nSCENE PLAN:\n${JSON.stringify(canonicalScenePlan, null, 2)}\n\nEXPLANATION:\n${explanation}` }]
      }],
      config: {
        systemInstruction: `ROLE: COHERENCE VALIDATOR.
You are a strict judge. You do NOT generate content. You only classify.

Given three inputs — a user intent, a validated scene plan, and an explanation — determine whether they form a coherent triangle:
1. Does the scene plan faithfully serve the user's intent?
2. Does the explanation accurately describe what the scene plan will produce?
3. Does the explanation address the learner's experience in a way that matches the intent?

If ALL three hold, return coherent: true.
If ANY link is broken, return coherent: false with a specific reason describing the mismatch.
Be strict. Vague or generic explanations that could apply to any oscillator should fail.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coherent: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ["coherent", "reason"],
        },
        temperature: 0.1,
      },
    });

    try {
      const result = JSON.parse(response.text);
      console.log(`[COHERENCE] Result — coherent: ${result.coherent}, reason: "${result.reason}"`);
      return result;
    } catch (e) {
      console.error(`[COHERENCE] Failed to parse response:`, response.text);
      return { coherent: false, reason: "Coherence validator returned unparseable output." };
    }
  }

  /**
   * LIBRARY MATCHER: Given user intent and the full snippet catalog,
   * picks the best matching key or returns null if nothing fits.
   * Prioritizes key matches first, then description relevance.
   */
  async sendLibraryMatch(
    intent: string,
    catalog: Array<{ key: string; description: string; tags: string[] }>
  ): Promise<string | null> {
    console.log(`[LIBRARY] Matching intent "${intent}" against ${catalog.length} catalog entries`);
    if (catalog.length === 0) {
      console.log(`[LIBRARY] Catalog is empty — no match possible`);
      return null;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';

    const catalogText = catalog.map(s =>
      `KEY: "${s.key}" | DESC: "${s.description}" | TAGS: [${s.tags.join(', ')}]`
    ).join('\n');

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: `USER INTENT: "${intent}"\n\nAVAILABLE SNIPPETS:\n${catalogText}` }] }],
      config: {
        systemInstruction: `ROLE: LIBRARY MATCHER.
You match a user's intent to the best existing visualization snippet from a catalog.

RULES:
1. First check if the intent closely matches any snippet KEY (exact or near-exact). Keys are the strongest signal.
2. If no key match, check if the intent is well-described by any snippet's DESCRIPTION or TAGS.
3. Only return a match if you are confident the snippet would satisfy the user's intent. Do not force a match.
4. If nothing fits, return matched: false.

Be strict. A vague or tangential match is worse than no match.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matched: { type: Type.BOOLEAN },
            key: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ["matched", "reason"],
        },
        temperature: 0.1,
      },
    });

    try {
      const result = JSON.parse(response.text);
      console.log(`[LIBRARY] Result — matched: ${result.matched}, key: "${result.key || 'none'}", reason: "${result.reason}"`);
      return result.matched && result.key ? result.key : null;
    } catch (e) {
      console.error(`[LIBRARY] Failed to parse response:`, response.text);
      return null;
    }
  }

  /**
   * Full planner loop:
   * 1. generate plan → validate → retry if invalid
   * 2. generate explanation → coherence check → retry explanation if incoherent
   * 3. return validated plan + coherent explanation
   */
  async generateValidatedScenePlan(intent: string): Promise<{ canonicalScenePlan: any; explanation: string }> {
    console.log(`[PIPELINE] ========== Starting scene plan pipeline ==========`);
    console.log(`[PIPELINE] Intent: "${intent}"`);
    const MAX_PLAN_RETRIES = 3;
    const MAX_COHERENCE_RETRIES = 3;
    let planErrors: string[] = [];

    for (let planAttempt = 0; planAttempt < MAX_PLAN_RETRIES; planAttempt++) {
      console.log(`[PIPELINE] Plan attempt ${planAttempt + 1}/${MAX_PLAN_RETRIES}`);
      const candidate = await this.sendPlannerMessage(intent, planErrors);
      if (!candidate) {
        console.warn(`[PIPELINE] Plan attempt ${planAttempt + 1} failed: unparseable output`);
        planErrors = ["Planner returned unparseable output."];
        continue;
      }

      const result = await this.validatePlanViaBackend(candidate);
      if (!result.valid || !result.canonicalScenePlan) {
        console.warn(`[PIPELINE] Plan attempt ${planAttempt + 1} failed validation:`, result.errors);
        planErrors = result.errors;
        continue;
      }

      console.log(`[PIPELINE] Plan validated on attempt ${planAttempt + 1}. Entering coherence loop...`);
      const canonicalScenePlan = result.canonicalScenePlan;
      let lastCoherenceReason = "";

      for (let cohAttempt = 0; cohAttempt < MAX_COHERENCE_RETRIES; cohAttempt++) {
        console.log(`[PIPELINE] Coherence attempt ${cohAttempt + 1}/${MAX_COHERENCE_RETRIES}`);
        const explanation = await this.sendPlannerExplanation(intent, canonicalScenePlan);
        const check = await this.sendCoherenceCheck(intent, canonicalScenePlan, explanation);

        if (check.coherent) {
          console.log(`[PIPELINE] ========== Pipeline SUCCESS (plan attempt ${planAttempt + 1}, coherence attempt ${cohAttempt + 1}) ==========`);
          return { canonicalScenePlan, explanation };
        }

        console.warn(`[PIPELINE] Coherence attempt ${cohAttempt + 1} failed: "${check.reason}"`);
        lastCoherenceReason = check.reason;
      }

      console.error(`[PIPELINE] Coherence exhausted after ${MAX_COHERENCE_RETRIES} attempts`);
      throw new Error(`Coherence check failed after ${MAX_COHERENCE_RETRIES} attempts. Last reason: ${lastCoherenceReason}`);
    }

    console.error(`[PIPELINE] Plan generation exhausted after ${MAX_PLAN_RETRIES} attempts`);
    throw new Error(`Scene plan generation failed after ${MAX_PLAN_RETRIES} attempts. Last errors: ${planErrors.join("; ")}`);
  }
}

export const geminiService = new GeminiService();
