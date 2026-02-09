import { Agent } from '@mastra/core/agent';
import { UPDATE_CLASSIFIER_INSTRUCTION } from '../prompts';

export const updateClassifierAgent = new Agent({
  id: 'update-classifier',
  name: 'Update Classifier',
  instructions: UPDATE_CLASSIFIER_INSTRUCTION,
  model: 'google/gemini-3-flash-preview',
});
