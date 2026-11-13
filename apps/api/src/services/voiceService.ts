import { createRequestScopedClient } from '../integrations/supabase/client';
import { findInquiryByIdForUser } from '../repositories/inquiryRepository';
import { findLearningSourceById } from '../repositories/learningSourceRepository';
import { voiceAssistantPipeline } from '../integrations/sarvam/client';

export async function processVoiceQueryForUser(
  accessToken: string,
  userId: string,
  audioBase64: string,
  mimeType: string = 'audio/webm',
  inquiryId?: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
): Promise<{ transcript: string; responseText: string; audioBase64: string; languageCode: string }> {
  let sourceContext: { title: string; content: string } | undefined;

  if (inquiryId) {
    const client = createRequestScopedClient(accessToken);
    const inquiry = await findInquiryByIdForUser(client, inquiryId, userId);
    if (inquiry) {
      const source = await findLearningSourceById(client, inquiry.learningSourceId);
      if (source) {
        sourceContext = {
          title: source.title,
          content: source.content,
        };
      }
    }
  }

  return voiceAssistantPipeline(audioBase64, mimeType, sourceContext, history);
}
