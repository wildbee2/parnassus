import type { EvaluateRequest, GenerateRequest, GeneratedResult, ProgressData } from '../counterpoint/model';
export type WorkerRequest =
  | { type: 'generate'; requestId: string; payload: GenerateRequest }
  | { type: 'evaluate'; requestId: string; payload: EvaluateRequest }
  | { type: 'cancel'; requestId: string };

export type WorkerResponse =
  | { type: 'progress'; requestId: string; payload: ProgressData }
  | { type: 'generated'; requestId: string; payload: GeneratedResult }
  | { type: 'evaluated'; requestId: string; payload: import('../counterpoint/model').EvaluationResult }
  | { type: 'error'; requestId: string; message: string };

