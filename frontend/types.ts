
export type Subject = 'Math' | 'Physics' | 'Chemistry' | 'Thermo' | 'Unknown';
export type TemporalMode = 'Steady' | 'Transient';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeSnippet?: string;
  subject?: Subject;
  temporalMode?: TemporalMode;
  suggestedEdit?: string; // The prompt to apply if the user clicks "Apply Edit"
  actionButton?: {
    label: string;
    prompt: string;
  };
  info?: {
    title: string;
    description: string;
  };
}

export interface CustomVector {
  id: string;
  name: string;
  points: { t: number, val: number }[];
  color: string;
  isVisible: boolean;
  logic?: string;
}

export interface RenderData {
  html: string;
  subject: Subject;
}
