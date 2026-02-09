import './load-env';
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';

import { plannerAgent } from './agents/planner';
import { explainerAgent } from './agents/explainer';
import { coherenceAgent } from './agents/coherence';
import { architectAgent } from './agents/architect';
import { libraryMatcherAgent } from './agents/library-matcher';
import { tutorAgent } from './agents/tutor';
import { cameramanAgent } from './agents/cameraman';
import { overseerAgent } from './agents/overseer';
import { timeCoordinatorAgent } from './agents/time-coordinator';
import { updateClassifierAgent } from './agents/update-classifier';
import { updatePlannerAgent } from './agents/update-planner';

import { generateWorkflow } from './workflows/generate';
import { libraryWorkflow } from './workflows/library';
import { spaideWorkflow } from './workflows/spaide';
import { updateWorkflow } from './workflows/update';

export const mastra = new Mastra({
  agents: {
    plannerAgent,
    explainerAgent,
    coherenceAgent,
    architectAgent,
    libraryMatcherAgent,
    tutorAgent,
    cameramanAgent,
    overseerAgent,
    timeCoordinatorAgent,
    updateClassifierAgent,
    updatePlannerAgent,
  },
  workflows: {
    generateWorkflow,
    libraryWorkflow,
    spaideWorkflow,
    updateWorkflow,
  },
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: 'file:./mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(),
          new CloudExporter(),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(),
        ],
      },
    },
  }),
});
