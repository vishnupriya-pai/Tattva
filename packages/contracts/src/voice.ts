import { z } from 'zod';

export const voiceQueryRequestSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().optional().default('audio/webm'),
  inquiryId: z.string().uuid().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional(),
});

export type VoiceQueryRequest = z.infer<typeof voiceQueryRequestSchema>;

export const voiceQueryResponseSchema = z.object({
  data: z.object({
    transcript: z.string(),
    responseText: z.string(),
    audioBase64: z.string(),
    languageCode: z.string(),
  }),
});

export type VoiceQueryResponse = z.infer<typeof voiceQueryResponseSchema>;
