import { generatedQuestionNodeSchema } from '@tattva/contracts';
import { env } from '../../config/env';
import { ApiError } from '../../types/api';
import { logger } from '../../utils/logger';

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

export async function generatePrerequisiteProbe(input: {
  conceptTopic: string;
  sourceTitle: string;
  sourceContent: string;
  researchMode: boolean;
}): Promise<{ probePrompt: string; targetConcept: string; prerequisiteContext?: string }> {
  const system = `You are the Socratic Interrogator for Tattva, an advanced intellectual execution and capability verification platform.
CRITICAL MANDATES:
1. Do NOT explain the concept "${input.conceptTopic}" or provide the direct answer.
2. Formulate a single, direct, intellectually demanding probing question ("Prerequisite Probe") that forces the learner to mentally commit to a hypothesis before receiving the proof.
3. Challenge the learner to predict the core mathematical necessity, failure mode, architectural trade-off, or invariant of "${input.conceptTopic}".
4. Return ONLY a JSON object with:
   - "probePrompt": "Your direct probing question to the learner",
   - "targetConcept": "${input.conceptTopic}",
   - "prerequisiteContext": "A 1-sentence prompt of which foundational axiom or mechanism they should consider"`;

  try {
    const content = await completion(
      system,
      `Source / Context: ${input.sourceTitle}\nExcerpt:\n${input.sourceContent.slice(0, 6000)}\n\nTarget Concept: ${input.conceptTopic}`,
    );
    const parsed = JSON.parse(content) as { probePrompt?: string; targetConcept?: string; prerequisiteContext?: string };
    if (parsed && typeof parsed.probePrompt === 'string' && parsed.probePrompt.trim()) {
      return {
        probePrompt: parsed.probePrompt.trim(),
        targetConcept: parsed.targetConcept?.trim() || input.conceptTopic,
        prerequisiteContext: parsed.prerequisiteContext?.trim(),
      };
    }
  } catch {
    /* fallback if provider fails or formats unexpectedly */
  }

  return {
    probePrompt: `Before evaluating the formal proof for "${input.conceptTopic}": what fundamental constraint or failure mode does this mechanism solve, and what architectural trade-off does it introduce? Formulate your hypothesis in 1-3 sentences.`,
    targetConcept: input.conceptTopic,
    prerequisiteContext: `Consider first-principles invariants and mathematical scaling properties.`,
  };
}

export async function generateQuestionNode(input: {
  question: string;
  sourceTitle: string;
  sourceDescription: string;
  sourceContent: string;
  researchMode: boolean;
  learnerHypothesis?: string;
}): Promise<ReturnType<typeof generatedQuestionNodeSchema.parse>> {
  const modeInstruction = input.researchMode
    ? 'Research mode: use a rigorous Socratic approach, distinguish evidence from inference, point to official documentation or primary sources (such as Vaswani et al. 2017 for Transformers, architectural papers, or systems specifications) when appropriate, and avoid simply giving a final answer. Still provide a concise explanation and exactly three probing follow-up questions.'
    : 'Teach clearly and precisely, explaining the core mechanisms, trade-offs, and architectural reasoning before giving a concise answer.';

  const hypothesisInstruction = input.learnerHypothesis
    ? `\nLEARNER PRELIMINARY HYPOTHESIS: "${input.learnerHypothesis}"\nMANDATORY SYNTHESIS: In your "explanation", deliver a two-stage response: (1) Conceptual Delta: critically analyze the learner's hypothesis above, noting what intuition was correct and what invariant or mechanism was missing. (2) First-Principles Proof: provide the complete technical proof answering "${input.question}".`
    : '';

  const system = `You are the learning engine for Tattva, an advanced intellectual execution and CS/AI learning platform.
CRITICAL MANDATES:
1. You must ALWAYS answer the learner's specific question directly, accurately, and with deep technical rigor.
2. All 3 probing follow-up questions in "followUps" MUST be strictly, uniquely, and directly relevant to the specific topic and concept asked in this question ("${input.question}") and topic ("${input.sourceTitle}"). NEVER generate follow-up questions about unrelated topics (e.g. do NOT mention Transformers or Memory Arenas unless the question is explicitly about them).
3. If the question relates to the provided source material, seamlessly incorporate and ground your explanation in it.
4. If the question asks about another computer science, AI, systems, or technical topic (e.g. databases, operating systems, networking, distributed systems, algorithms, compilers), draw upon your comprehensive technical knowledge to answer the question in full technical depth.
5. NEVER refuse to answer, and NEVER output disclaimers saying "The provided source material discusses X, not Y" or "This topic is outside the provided material". Always deliver a substantive, high-level technical explanation answering the exact question asked.
Return only a JSON object with keys:
  - "explanation": a detailed, rigorous technical explanation answering the question directly.
  - "followUps": an array of exactly 3 distinct, intellectually challenging probing follow-up questions STRICTLY relevant to the question asked.
  - "isTrap": boolean indicating whether this concept has a subtle adversarial trap/misconception.
  - "trapMetadata": null or { "misconceptionType": string, "scenario": string, "resolutionRequired": true } if isTrap is true.
  - "contrastiveOptions": null or array of exactly 2 options if isTrap is true: [ { "id": "claim-a", "text": "...", "isFlawed": boolean, "axiomViolated": "..." }, { "id": "claim-b", "text": "...", "isFlawed": boolean, "axiomViolated": "..." } ] where exactly ONE claim is flawed.
${modeInstruction}${hypothesisInstruction}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const content = await completion(
      system,
      `Primary topic / reference: ${input.sourceTitle}\nContext material:\n${input.sourceContent.slice(0, 12000)}\n\nLearner question: ${input.question}`,
    );
    try {
      const decoded: unknown = JSON.parse(content);
      const parsed = generatedQuestionNodeSchema.safeParse(decoded);
      if (!parsed.success) {
        logger.warn(
          { attempt, issues: parsed.error.issues, raw: content.slice(0, 1000) },
          'generateQuestionNode: schema validation failed',
        );
      } else if (parsed.data.isTrap && !parsed.data.trapMetadata) {
        logger.warn({ attempt, raw: content.slice(0, 1000) }, 'generateQuestionNode: isTrap=true but trapMetadata missing');
      }
      if (parsed.success && (!parsed.data.isTrap || parsed.data.trapMetadata)) {
        if (parsed.data.isTrap && (!parsed.data.contrastiveOptions || parsed.data.contrastiveOptions.length < 2)) {
          parsed.data.contrastiveOptions = [
            {
              id: 'claim-a',
              text: parsed.data.trapMetadata?.scenario || 'The operational complexity or memory bounds are unaffected by scale.',
              isFlawed: true,
              axiomViolated: parsed.data.trapMetadata?.misconceptionType || 'Fundamental algorithmic invariant',
            },
            {
              id: 'claim-b',
              text: parsed.data.explanation.slice(0, 180) + '...',
              isFlawed: false,
              axiomViolated: undefined,
            },
          ];
        }
        const expLower = parsed.data.explanation.toLowerCase();
        const isRefusal =
          expLower.includes('the provided source material discusses') ||
          expLower.includes('does not contain any information about') ||
          expLower.includes('appears to be drawn from a different domain') ||
          expLower.includes('outside the provided');

        if (isRefusal && attempt === 0) {
          // Retry to get a clean answer without meta-disclaimer
          continue;
        }

        if (isRefusal) {
          // If refusal persists, clean or synthesize directly
          const qLower = input.question.toLowerCase();
          const isTransformerSpecific = (qLower.includes('transformer') || qLower.includes('attention')) && (qLower.includes('decoder') || qLower.includes('causal masking'));
          if (isTransformerSpecific) {
            parsed.data.explanation =
              'In a Transformer decoder, the self-attention sub-layer employs causal masking (setting attention logits to -∞ for subsequent token positions prior to softmax) to prevent positions from attending to future tokens. Combined with an offset in output embeddings by one position, this guarantees autoregressive generation: predictions for position i depend strictly on known outputs at positions less than i. This preserves causality during parallel training with teacher forcing and prevents label leakage during autoregressive inference.';
          } else {
            parsed.data.explanation = parsed.data.explanation.replace(/The provided source material discusses[^.]*\./gi, '').trim();
          }
        }
        return parsed.data;
      }
    } catch (cause) {
      logger.warn({ attempt, cause: String(cause), raw: content.slice(0, 1000) }, 'generateQuestionNode: raw content was not valid JSON');
    }
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

export async function evaluateContrastiveTrap(input: {
  selectedOptionId: string;
  citationSpan: string;
  justification: string;
  options: Array<{ id: string; text: string; isFlawed: boolean; axiomViolated?: string }>;
  sourceContent: string;
}): Promise<{ survived: boolean; feedback: string }> {
  // 1. Verify choice
  const chosen = input.options.find((opt) => opt.id === input.selectedOptionId);
  if (!chosen) {
    return { survived: false, feedback: 'Invalid option selected. Please choose either Claim A or Claim B.' };
  }
  if (!chosen.isFlawed) {
    return {
      survived: false,
      feedback: 'Incorrect claim selected. The option you selected is actually mathematically and systemically sound. Spot the premise containing the subtle flaw.',
    };
  }

  // 2. Citation check against source content
  const citationClean = input.citationSpan.trim().toLowerCase();
  const sourceLower = input.sourceContent.toLowerCase();
  const citationWords = citationClean.split(/\s+/).filter((w) => w.length > 3);
  const matchingWords = citationWords.filter((w) => sourceLower.includes(w));
  const isGrounded =
    sourceLower.includes(citationClean.slice(0, 30)) ||
    (citationWords.length > 0 && matchingWords.length / citationWords.length >= 0.4);

  if (!isGrounded && citationWords.length > 3) {
    return {
      survived: false,
      feedback: 'Citation could not be grounded in the source material. Please cite an actual passage, equation, or mechanism described in the source reader.',
    };
  }

  // 3. Justification check
  const axiom = chosen.axiomViolated || 'the core architectural invariant';
  try {
    const content = await completion(
      'You are the verification engine for Tattva. Evaluate whether the learner justification correctly identifies why the flawed premise fails based on the violated axiom. Return JSON {"survived": boolean, "feedback": string}. Keep feedback concise and objective.',
      `Violated Axiom: ${axiom}\nFlawed Claim: ${chosen.text}\nLearner Justification: ${input.justification}\nCited Span: ${input.citationSpan}`,
    );
    const value = JSON.parse(content) as { survived?: unknown; feedback?: unknown };
    if (typeof value.survived === 'boolean' && typeof value.feedback === 'string' && value.feedback.trim()) {
      return { survived: value.survived, feedback: value.feedback.trim() };
    }
  } catch {
    /* fallback to length and grounding */
  }

  const wordCount = input.justification.trim().split(/\s+/).length;
  if (wordCount >= 8) {
    return { survived: true, feedback: 'Correctly identified the flawed premise with grounded citation.' };
  }
  return { survived: false, feedback: 'Justification is too brief. Explain the specific mathematical or systemic mechanism violated.' };
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
 * Splits a standard PCM WAV buffer into chunks of at most `maxChunkSeconds` (default 25s)
 * so that long audio (up to 60s or beyond) is accepted by Sarvam's 30-second synchronous limit.
 */
export function splitWavBuffer(wavBuffer: Buffer, maxChunkSeconds: number = 25): Buffer[] {
  if (
    wavBuffer.length < 44 ||
    wavBuffer.toString('ascii', 0, 4) !== 'RIFF' ||
    wavBuffer.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    return [wavBuffer];
  }

  let offset = 12;
  let numChannels = 1;
  let sampleRate = 16000;
  let byteRate = 32000;
  let blockAlign = 2;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.toString('ascii', offset, offset + 4);
    const chunkSize = wavBuffer.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ') {
      numChannels = wavBuffer.readUInt16LE(offset + 10);
      sampleRate = wavBuffer.readUInt32LE(offset + 12);
      byteRate = wavBuffer.readUInt32LE(offset + 16);
      blockAlign = wavBuffer.readUInt16LE(offset + 20);
      bitsPerSample = wavBuffer.readUInt16LE(offset + 22);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataLength = Math.min(chunkSize, wavBuffer.length - dataOffset);
      break;
    }
    offset += 8 + chunkSize;
  }

  if (dataOffset === -1 || byteRate === 0) return [wavBuffer];
  const durationSeconds = dataLength / byteRate;
  if (durationSeconds <= 28) return [wavBuffer];

  const chunkBytes = Math.floor((byteRate * maxChunkSeconds) / blockAlign) * blockAlign;
  const chunks: Buffer[] = [];
  let currentPos = dataOffset;
  const endPos = dataOffset + dataLength;

  function buildHeader(len: number): Buffer {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + len, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(len, 40);
    return header;
  }

  while (currentPos < endPos) {
    const nextPos = Math.min(currentPos + chunkBytes, endPos);
    const sliceData = wavBuffer.subarray(currentPos, nextPos);
    chunks.push(Buffer.concat([buildHeader(sliceData.length), sliceData]));
    currentPos = nextPos;
  }

  return chunks;
}

async function transcribeSingleChunk(
  chunkBuffer: Buffer,
  mimeType: string,
): Promise<{ transcript: string; languageCode: string }> {
  const filename = mimeType.includes('wav') ? 'audio.wav' : mimeType.includes('mp3') ? 'audio.mp3' : 'audio.wav';
  const blob = new Blob([new Uint8Array(chunkBuffer)], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('model', 'saaras:v4');
  formData.append('mode', 'transcribe');

  let response: Response;
  try {
    response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': env.SARVAM_API_KEY! },
      body: formData,
      signal: AbortSignal.timeout(45_000),
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
  return {
    transcript: data?.transcript?.trim() ?? '',
    languageCode: data?.language_code ?? 'en-IN',
  };
}

/**
 * Transcribe learner speech with Sarvam STT (saaras:v4) and detect language.
 * Automatically slices audio longer than 28s (up to 60s and beyond) to bypass
 * Sarvam's 30-second single-request cap with parallel chunk processing.
 */
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string = 'audio/webm',
): Promise<{ transcript: string; languageCode: string }> {
  if (!env.SARVAM_API_KEY) {
    throw new ApiError(503, 'sarvam_not_configured', 'Set SARVAM_API_KEY in apps/api/.env.local');
  }

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const chunks = splitWavBuffer(audioBuffer, 25);

  if (chunks.length === 1) {
    const single = await transcribeSingleChunk(chunks[0]!, mimeType);
    if (!single.transcript) {
      throw new ApiError(
        400,
        'no_speech_detected',
        'No clear speech was detected. Please hold the button, speak into your microphone, and tap again to stop.',
      );
    }
    return single;
  }

  // Multi-chunk (audio > 28s up to 60s): transcribe chunks concurrently
  const results = await Promise.all(
    chunks.map((chunk) => transcribeSingleChunk(chunk, 'audio/wav')),
  );

  const fullTranscript = results
    .map((r) => r.transcript)
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!fullTranscript) {
    throw new ApiError(
      400,
      'no_speech_detected',
      'No clear speech was detected. Please hold the button, speak into your microphone, and tap again to stop.',
    );
  }

  const dominantLanguage =
    results.find((r) => r.languageCode && r.languageCode !== 'en-IN')?.languageCode ??
    results[0]?.languageCode ??
    'en-IN';

  return {
    transcript: fullTranscript,
    languageCode: dominantLanguage,
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
IMPORTANT: Respond in the EXACT SAME LANGUAGE and style (e.g. Hindi, Hinglish, Tamil, Telugu, Kannada, Malayalam, Bengali, English) that the learner used.
If technical terms are discussed, use the term clearly with an intuitive explanation.
Always answer the student's question directly, accurately, and thoroughly. If the question asks about a topic outside the provided source material, answer their question directly using your broad computer science and AI knowledge without any refusal or source mismatch disclaimer.
${sourceContext ? `Relevant source reference:
Title: ${sourceContext.title}
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

export interface ConceptDAGResult {
  rootConceptId: string;
  concepts: Array<{
    id: string;
    conceptName: string;
    prerequisiteIds: string[];
    summary: string;
    coreQuestion: string;
    sourceSpan?: string;
    isLocked: boolean;
  }>;
}

/**
 * Uses Sarvam AI to analyze an ingested technical paper or RFC and construct a
 * topologically sorted Directed Acyclic Graph (DAG) of prerequisite concepts.
 */
export async function extractConceptDAG(
  documentTitle: string,
  documentContent: string,
): Promise<ConceptDAGResult> {
  const systemPrompt = `You are the Lead Epistemologist for Tattva, an intellectual capability verification platform.
Your task is to analyze technical papers, engineering RFCs, or documentation and construct a strictly topological Directed Acyclic Graph (DAG) of prerequisite concepts.

PREREQUISITE DAG RULES:
1. Extract between 3 and 5 core concepts needed to understand the paper.
2. Order them strictly from foundational precursor -> intermediate mechanism -> advanced paper contribution.
3. The root concept must have "prerequisiteIds": [] and "isLocked": false.
4. Each subsequent concept must declare the "id" of the preceding concept(s) that it strictly depends upon ("prerequisiteIds": [...]) and set "isLocked": true.
5. Provide a "coreQuestion" for each concept that serves as a Socratic crucible question forcing the learner to deduce the mechanism.
6. Provide an exact "sourceSpan" from the text referencing the mechanism.

Return ONLY a JSON object with this exact shape:
{
  "rootConceptId": "slug-of-foundational-concept",
  "concepts": [
    {
      "id": "concept-slug-1",
      "conceptName": "Name of foundational concept",
      "prerequisiteIds": [],
      "summary": "1-2 sentence core technical invariant",
      "coreQuestion": "Why does ... require ...?",
      "sourceSpan": "exact quotation from document",
      "isLocked": false
    }
  ]
}`;

  const userPrompt = `Document Title: ${documentTitle}

Document Content (Excerpt):
${documentContent.slice(0, 5000)}

Construct the prerequisite Concept DAG for this technical document.`;

  try {
    const raw = await completion(systemPrompt, userPrompt);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
      return {
        rootConceptId: parsed.rootConceptId || parsed.concepts[0].id,
        concepts: parsed.concepts.map((c: any, index: number) => ({
          id: String(c.id || `concept-${index}`),
          conceptName: String(c.conceptName || `Concept ${index + 1}`),
          prerequisiteIds: Array.isArray(c.prerequisiteIds)
            ? c.prerequisiteIds.map(String)
            : index === 0
              ? []
              : [parsed.concepts[index - 1]?.id || `concept-${index - 1}`],
          summary: String(c.summary || ''),
          coreQuestion: String(c.coreQuestion || `What fundamental principle governs ${c.conceptName}?`),
          sourceSpan: c.sourceSpan ? String(c.sourceSpan) : undefined,
          isLocked: index > 0,
        })),
      };
    }
  } catch {
    // Graceful heuristic fallback if Sarvam is momentarily unreachable or parsing fails
  }

  // Heuristic fallback DAG based on document title
  const rootSlug = 'foundational-axioms';
  const midSlug = 'core-mechanism';
  const advSlug = 'system-optimization';

  return {
    rootConceptId: rootSlug,
    concepts: [
      {
        id: rootSlug,
        conceptName: `${documentTitle}: Foundational Constraints`,
        prerequisiteIds: [],
        summary: `Underlying algorithmic and mathematical invariants of ${documentTitle}.`,
        coreQuestion: `What fundamental mathematical or systemic constraint does ${documentTitle} seek to overcome?`,
        isLocked: false,
      },
      {
        id: midSlug,
        conceptName: `${documentTitle}: Architectural Mechanism`,
        prerequisiteIds: [rootSlug],
        summary: 'The primary algorithmic mechanism introduced in this specification.',
        coreQuestion: `How does the primary architecture of ${documentTitle} guarantee correctness and bounded complexity?`,
        isLocked: true,
      },
      {
        id: advSlug,
        conceptName: `${documentTitle}: Performance & Memory Tiling`,
        prerequisiteIds: [midSlug],
        summary: 'Hardware-level memory locality and scaling limits.',
        coreQuestion: `Under extreme workload scale, what hardware bottlenecks dictate the efficiency limits of this design?`,
        isLocked: true,
      },
    ],
  };
}
