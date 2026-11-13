import { generatedQuestionNodeSchema } from '@tattva/contracts';
import { env } from '../../config/env';
import { ApiError } from '../../types/api';

const endpoint = 'https://api.sarvam.ai/v1/chat/completions';
const model = 'sarvam-105b';

async function completion(system: string, user: string): Promise<string> {
  if (!env.SARVAM_API_KEY) {
    throw new ApiError(503, 'sarvam_not_configured', 'Set SARVAM_API_KEY in apps/api/.env.local to enable AI features');
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': env.SARVAM_API_KEY },
      body: JSON.stringify({
        model,
        reasoning_effort: null,
        temperature: 0.3,
        max_tokens: 1600,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new ApiError(502, 'sarvam_unavailable', 'Sarvam could not be reached. Please retry.');
  }

  if (!response.ok) {
    const status = response.status;
    throw new ApiError(status === 429 ? 429 : 502, 'sarvam_request_failed', 'Sarvam could not complete this request. Please retry.');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object') throw new ApiError(502, 'sarvam_invalid_response', 'Sarvam returned an invalid response.');
  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new ApiError(502, 'sarvam_invalid_response', 'Sarvam returned an empty response.');
  return content;
}

export async function generateQuestionNode(input: {
  question: string;
  sourceTitle: string;
  sourceDescription: string;
  sourceContent: string;
  researchMode: boolean;
}): Promise<ReturnType<typeof generatedQuestionNodeSchema.parse>> {
  const modeInstruction = input.researchMode
    ? 'Research mode: use a rigorous Socratic approach, distinguish evidence from inference, point to official documentation or primary sources when appropriate, and avoid simply giving a final answer. Still provide a concise explanation and exactly three probing follow-up questions.'
    : 'Teach clearly and precisely, explaining the reasoning and trade-offs before giving a concise answer.';
  const system = `You are the learning engine for Tattva. Return only a JSON object with keys explanation (string), followUps (array of exactly 3 distinct strings), isTrap (boolean), trapMetadata (null or { misconceptionType, scenario, resolutionRequired }). Use isTrap=true only when the explanation intentionally sets up a meaningful misconception check; then create a fair, technically precise scenario and set resolutionRequired=true. Otherwise trapMetadata must be null. Never invent source-specific facts. ${modeInstruction}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const content = await completion(system, `Learning source: ${input.sourceTitle}\nSource description: ${input.sourceDescription}\nSource material:\n${input.sourceContent.slice(0, 12000)}\n\nLearner question: ${input.question}`);
    try {
      const decoded: unknown = JSON.parse(content);
      const parsed = generatedQuestionNodeSchema.safeParse(decoded);
      if (parsed.success && (!parsed.data.isTrap || parsed.data.trapMetadata)) return parsed.data;
    } catch { /* retry once on malformed model JSON */ }
  }
  throw new ApiError(422, 'sarvam_invalid_output', 'The generated answer did not meet Tattva’s response requirements. Please retry.');
}

export async function evaluateTrap(response: string, scenario: string): Promise<{ survived: boolean; feedback: string }> {
  const content = await completion(
    'Evaluate the learner response against the trap scenario. Return JSON {"survived": boolean, "feedback": string}. Only mark survived when the response identifies the key technical flaw and explains why. Give brief, constructive feedback.',
    `Trap scenario: ${scenario}\nLearner response: ${response}`,
  );
  try {
    const value = JSON.parse(content) as { survived?: unknown; feedback?: unknown };
    if (typeof value.survived === 'boolean' && typeof value.feedback === 'string' && value.feedback.trim()) {
      return { survived: value.survived, feedback: value.feedback.trim() };
    }
  } catch { /* surface provider contract failures clearly */ }
  throw new ApiError(422, 'sarvam_invalid_output', 'Trap evaluation returned an invalid result. Please retry.');
}
