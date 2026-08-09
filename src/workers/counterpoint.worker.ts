import { evaluateCounterpoint } from '../counterpoint/evaluator';
import { generateCounterpointScore } from '../generator';
import type { WorkerRequest, WorkerResponse } from '../workers/types';
import type { GeneratedResult, ProgressData } from '../counterpoint/model';

const activeRequests = new Set<string>();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === 'cancel') {
    activeRequests.delete(request.requestId);
    return;
  }
  activeRequests.add(request.requestId);
  try {
    if (request.type === 'evaluate') {
      const result = evaluateCounterpoint(request.payload.score);
      const response: WorkerResponse = { type: 'evaluated', requestId: request.requestId, payload: result };
      self.postMessage(response);
      return;
    }
    if (request.type === 'generate') {
      const progress: ProgressData = { stage: 'search', current: 1, total: 1, candidatesExamined: 1 };
      self.postMessage({ type: 'progress', requestId: request.requestId, payload: progress } satisfies WorkerResponse);
      const result: GeneratedResult = generateCounterpointScore(request.payload);
      self.postMessage({ type: 'generated', requestId: request.requestId, payload: result } satisfies WorkerResponse);
    }
  } catch (error) {
    self.postMessage({ type: 'error', requestId: request.requestId, message: error instanceof Error ? error.message : 'Unknown error' } satisfies WorkerResponse);
  } finally {
    activeRequests.delete(request.requestId);
  }
};
