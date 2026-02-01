
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
        
        PROTOCOL FOR UPDATING THE SIMULATION:
        - YOU ARE PROHIBITED FROM GENERATING HTML, JAVASCRIPT, OR THREE.JS CODE BLOCKS.
        - You cannot update the code yourself. You must only OFFER to update it.
        - If the user's request requires a visualization change, you must provide a natural language PROMPT for the Architect.
        - Wrap this Architect Prompt in [SUGGESTED_EDIT] tags.
        - Example: "I can adjust the damping for you. [SUGGESTED_EDIT]Modify the damping coefficient in the physics loop to 0.5 to show higher energy loss.[/SUGGESTED_EDIT]"
        
        CRITICAL: Never promise a code update without providing the [SUGGESTED_EDIT] button. Do not generate code yourself.
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
}

export const geminiService = new GeminiService();
