
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
}

export const geminiService = new GeminiService();
