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

/**
 * Maps a BCP-47 language code to a natural edtech/conversational persona in bulbul:v4-flash.
 */
function selectSpeaker(languageCode?: string): string {
  if (!languageCode) return 'aparna_en_edtech';
  const prefix = languageCode.toLowerCase().split('-')[0];
  switch (prefix) {
    case 'hi':
      return 'ishita_hi_edtech';
    case 'bn':
      return 'arnab_bn_conversation';
    case 'kn':
      return 'chaitra_kn_conversation';
    case 'ta':
      return 'gokul_ta_narration';
    case 'te':
      return 'kavitha_te_conversation';
    case 'mr':
      return 'ishita_mr_conversational';
    case 'gu':
      return 'pooja_gu_conversational';
    case 'pa':
      return 'anand_pa_conversation';
    case 'en':
    default:
      return 'aparna_en_edtech';
  }
}

/**
 * Transcribe learner speech with Sarvam STT (saaras:v4) and detect language.
 */
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string = 'audio/webm',
): Promise<{ transcript: string; languageCode: string }> {
  if (!env.SARVAM_API_KEY) {
    throw new ApiError(503, 'sarvam_not_configured', 'Set SARVAM_API_KEY in apps/api/.env.local');
  }

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const filename = mimeType.includes('wav') ? 'audio.wav' : mimeType.includes('mp3') ? 'audio.mp3' : 'audio.wav';
  const blob = new Blob([audioBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('model', 'saaras:v4');
  formData.append('mode', 'transcribe');

  let response: Response;
  try {
    response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': env.SARVAM_API_KEY },
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ApiError(502, 'sarvam_unavailable', 'Sarvam STT could not be reached. Please retry.');
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const msg = errorBody?.error?.message;
    throw new ApiError(
      response.status === 429 ? 429 : 502,
      'sarvam_stt_failed',
      msg ? `Sarvam STT: ${msg}` : 'Speech recognition failed. Please speak clearly into your mic and retry.',
    );
  }

  const data = (await response.json().catch(() => null)) as { transcript?: string; language_code?: string } | null;
  const transcript = data?.transcript?.trim() ?? '';

  if (!transcript) {
    throw new ApiError(
      400,
      'no_speech_detected',
      'No clear speech was detected. Please hold the button, speak into your microphone, and tap again to stop.',
    );
  }

  return {
    transcript,
    languageCode: data?.language_code ?? 'en-IN',
  };
}

/**
 * Conversational LLM reasoning with sarvam-105b-conversations.
 */
export async function chatCompletionVoice(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): Promise<string> {
  if (!env.SARVAM_API_KEY) {
    throw new ApiError(503, 'sarvam_not_configured', 'Set SARVAM_API_KEY in apps/api/.env.local');
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': env.SARVAM_API_KEY },
      body: JSON.stringify({
        model: 'sarvam-105b-conversations',
        temperature: 0.3,
        max_tokens: 350,
        messages,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ApiError(502, 'sarvam_unavailable', 'Sarvam conversational LLM could not be reached.');
  }

  if (!response.ok) {
    throw new ApiError(response.status === 429 ? 429 : 502, 'sarvam_llm_failed', 'Conversational AI reasoning failed.');
  }

  const payload: unknown = await response.json().catch(() => null);
  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new ApiError(502, 'sarvam_invalid_response', 'Sarvam returned an empty response.');
  }
  return content.trim();
}

/**
 * Synthesize spoken voice with Sarvam TTS (bulbul:v4-flash).
 */
export async function synthesizeSpeech(
  text: string,
  languageCode: string = 'en-IN',
): Promise<{ audioBase64: string }> {
  if (!env.SARVAM_API_KEY) {
    throw new ApiError(503, 'sarvam_not_configured', 'Set SARVAM_API_KEY in apps/api/.env.local');
  }

  const speaker = selectSpeaker(languageCode);
  // Truncate cleanly if text is very long to optimize speed and stay within limits
  const cleanText = text.slice(0, 1000);

  let response: Response;
  try {
    response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': env.SARVAM_API_KEY,
      },
      body: JSON.stringify({
        text: cleanText,
        target_language_code: languageCode,
        speaker,
        model: 'bulbul:v4-flash',
        pace: 1.0,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ApiError(502, 'sarvam_unavailable', 'Sarvam TTS could not be reached.');
  }

  if (!response.ok) {
    throw new ApiError(response.status === 429 ? 429 : 502, 'sarvam_tts_failed', 'Voice synthesis failed.');
  }

  const data = (await response.json().catch(() => null)) as { audios?: string[] } | null;
  const audioBase64 = data?.audios?.[0];
  if (!audioBase64) {
    throw new ApiError(502, 'sarvam_invalid_audio', 'Failed to generate voice audio.');
  }

  return { audioBase64 };
}

/**
 * End-to-end Voice Assistant Pipeline (STT saaras:v4 -> LLM sarvam-105b-conversations -> TTS bulbul:v4-flash).
 */
export async function voiceAssistantPipeline(
  audioBase64: string,
  mimeType: string = 'audio/webm',
  sourceContext?: { title: string; content: string },
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<{ transcript: string; responseText: string; audioBase64: string; languageCode: string }> {
  // 1. Speech-to-Text with automatic language detection
  const { transcript, languageCode } = await transcribeAudio(audioBase64, mimeType);

  if (!transcript) {
    throw new ApiError(400, 'no_speech_detected', 'Could not detect clear speech in the audio recording. Please speak clearly and retry.');
  }

  // 2. Build educational conversation context
  const systemPrompt = `You are Tattva's intelligent, multilingual educational voice tutor.
Speak naturally and concisely (around 2 to 4 sentences, max 80 words) so it is clear and comfortable for the student to listen to.
IMPORTANT: Respond in the EXACT SAME LANGUAGE and style (e.g. Hindi, Hinglish, Tamil, Telugu, Kannada, Bengali, English) that the learner used.
If technical terms are discussed, use the term clearly with an intuitive explanation.
${sourceContext ? `Ground your explanation in the source material:
Source Title: ${sourceContext.title}
Context:
${sourceContext.content.slice(0, 4000)}` : ''}`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-4), // keep last 4 exchanges for conversational continuity
    { role: 'user', content: transcript },
  ];

  // 3. Conversational LLM reasoning
  const responseText = await chatCompletionVoice(messages);

  // 4. Text-to-Speech voice synthesis in matching language
  const { audioBase64: voiceAudio } = await synthesizeSpeech(responseText, languageCode);

  return {
    transcript,
    responseText,
    audioBase64: voiceAudio,
    languageCode,
  };
}
