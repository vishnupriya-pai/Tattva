import {
  createInquiryResponseSchema,
  deleteInquiryResponseSchema,
  getInquiryResponseSchema,
  discoverConnectionsResponseSchema,
  type DiscoverConnectionsResponse,
  healthResponseSchema,
  listInquiriesResponseSchema,
  meResponseSchema,
  type CreateInquiryResponse,
  type DeleteInquiryResponse,
  type GetInquiryResponse,
  type HealthResponse,
  type ListInquiriesResponse,
  type MeResponse,
  createQuestionNodeResponseSchema,
  trapAttemptResponseSchema,
  staminaResponseSchema,
  voiceQueryResponseSchema,
  type CreateQuestionNodeResponse,
  type TrapAttemptResponse,
  type StaminaResponse,
  type VoiceQueryRequest,
  type VoiceQueryResponse,
} from '@tattva/contracts';
import { getAccessToken } from './auth';

/** Minimal shape of a Zod schema's `safeParse`, to avoid a direct `zod` dependency here. */
interface ParseableSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: unknown };
}

/**
 * Centralized frontend API client (docs/ARCHITECTURE.md §2). All requests to
 * apps/api go through here so the base URL, auth header attachment
 * (ADR-002), and response validation live in exactly one place rather than
 * scattered fetch() calls.
 */
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function getHealth(): Promise<HealthResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
  } catch (cause) {
    throw new ApiClientError('Could not reach the Tattva API', cause);
  }

  if (!response.ok) {
    throw new ApiClientError(`Tattva API health check failed with status ${response.status}`);
  }

  const json: unknown = await response.json();
  const parsed = healthResponseSchema.safeParse(json);

  if (!parsed.success) {
    throw new ApiClientError('Tattva API returned an unexpected health payload', parsed.error);
  }

  return parsed.data;
}

async function authedRequest<T>(
  path: string,
  schema: ParseableSchema<T>,
  init?: RequestInit,
): Promise<T> {
  const accessToken = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${accessToken}`,
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw new ApiClientError(`Could not reach the Tattva API at ${path}`, cause);
  }

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = json && typeof json === 'object' && 'error' in json &&
      (json as { error?: { message?: unknown } }).error?.message;
    throw new ApiClientError(
      typeof errorMessage === 'string' ? errorMessage : `Request to ${path} failed with status ${response.status}`,
      json,
    );
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiClientError(`Tattva API returned an unexpected payload for ${path}`, parsed.error);
  }

  return parsed.data;
}

export function getMe(): Promise<MeResponse> {
  return authedRequest('/api/v1/me', meResponseSchema);
}

export function createInquiry(learningSourceId: string, title?: string): Promise<CreateInquiryResponse> {
  return authedRequest('/api/v1/inquiries', createInquiryResponseSchema, {
    method: 'POST',
    body: JSON.stringify({ learningSourceId, ...(title ? { title } : {}) }),
  });
}

export function listInquiries(): Promise<ListInquiriesResponse> {
  return authedRequest('/api/v1/inquiries', listInquiriesResponseSchema);
}

export function getInquiry(inquiryId: string): Promise<GetInquiryResponse> {
  return authedRequest(`/api/v1/inquiries/${inquiryId}`, getInquiryResponseSchema);
}

/** Verified "hidden connections": one Sarvam call; used by "Find connections" in the Knowledge Map. */
export function discoverConnections(inquiryId: string): Promise<DiscoverConnectionsResponse> {
  return authedRequest(`/api/v1/inquiries/${inquiryId}/connections/discover`, discoverConnectionsResponseSchema, {
    method: 'POST',
  });
}

export function deleteInquiry(inquiryId: string): Promise<DeleteInquiryResponse> {
  return authedRequest(`/api/v1/inquiries/${inquiryId}`, deleteInquiryResponseSchema, {
    method: 'DELETE',
  });
}

export function createQuestionNode(inquiryId: string, input: {
  question: string; parentNodeId: string | null; selectedFollowUpId: string | null; researchMode: boolean;
}): Promise<CreateQuestionNodeResponse> {
  return authedRequest(`/api/v1/inquiries/${inquiryId}/nodes`, createQuestionNodeResponseSchema, {
    method: 'POST', body: JSON.stringify(input),
  });
}

export function submitTrapAttempt(nodeId: string, response: string): Promise<TrapAttemptResponse> {
  return authedRequest(`/api/v1/question-nodes/${nodeId}/trap-attempts`, trapAttemptResponseSchema, {
    method: 'POST', body: JSON.stringify({ response }),
  });
}

export function getStamina(): Promise<StaminaResponse> {
  return authedRequest('/api/v1/stamina/me', staminaResponseSchema);
}

export function sendVoiceQuery(payload: VoiceQueryRequest): Promise<VoiceQueryResponse> {
  return authedRequest('/api/v1/voice/ask', voiceQueryResponseSchema, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
