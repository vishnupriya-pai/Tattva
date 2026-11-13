import { describe, it, expect } from 'vitest';
import { splitWavBuffer } from './client';

function createMockWav(seconds: number, sampleRate: number = 16000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataLength = byteRate * seconds;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
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
  header.writeUInt32LE(dataLength, 40);

  const pcmData = Buffer.alloc(dataLength);
  return Buffer.concat([header, pcmData]);
}

describe('Sarvam Audio Slicing & Chunking', () => {
  it('keeps audio under 28 seconds as a single buffer', () => {
    const audio20s = createMockWav(20);
    const chunks = splitWavBuffer(audio20s, 25);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.length).toBe(audio20s.length);
  });

  it('accurately splits 45-second audio into two valid WAV chunks under 25s', () => {
    const audio45s = createMockWav(45);
    const chunks = splitWavBuffer(audio45s, 25);

    expect(chunks).toHaveLength(2);

    // First chunk should be exactly 25s of PCM + 44 bytes header
    expect(chunks[0]!.length).toBe(44 + 32000 * 25);
    expect(chunks[0]!.toString('ascii', 0, 4)).toBe('RIFF');
    expect(chunks[0]!.toString('ascii', 8, 12)).toBe('WAVE');

    // Second chunk should be exactly 20s of PCM + 44 bytes header
    expect(chunks[1]!.length).toBe(44 + 32000 * 20);
    expect(chunks[1]!.toString('ascii', 0, 4)).toBe('RIFF');
    expect(chunks[1]!.toString('ascii', 8, 12)).toBe('WAVE');
  });

  it('accurately splits 60-second audio into three valid WAV chunks <= 25s', () => {
    const audio60s = createMockWav(60);
    const chunks = splitWavBuffer(audio60s, 25);

    expect(chunks).toHaveLength(3);
    // 25s + 25s + 10s
    expect(chunks[0]!.length).toBe(44 + 32000 * 25);
    expect(chunks[1]!.length).toBe(44 + 32000 * 25);
    expect(chunks[2]!.length).toBe(44 + 32000 * 10);

    for (const chunk of chunks) {
      expect(chunk.toString('ascii', 0, 4)).toBe('RIFF');
      expect(chunk.toString('ascii', 8, 12)).toBe('WAVE');
      // Subchunk size matches header
      const dataSize = chunk.readUInt32LE(40);
      expect(chunk.length).toBe(44 + dataSize);
    }
  });

  it('gracefully handles non-WAV buffer without crashing', () => {
    const randomBuffer = Buffer.from('not a wav file header at all');
    const chunks = splitWavBuffer(randomBuffer, 25);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(randomBuffer);
  });
});
