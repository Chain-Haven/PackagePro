import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  readEncryptedRecording,
  writeEncryptedRecordingFromChunks,
} from '../../../electron/video-storage';

describe('video storage helpers', () => {
  it('writes and reads finalized recordings without whole-file concatenation in the caller', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'packagepro-video-'));
    const outputPath = path.join(tempDir, 'recording.enc');
    const key = Buffer.alloc(32, 7);
    const chunks = [Buffer.from('hello '), Buffer.from('world')];

    async function* generateChunks() {
      for (const chunk of chunks) {
        yield chunk;
      }
    }

    const size = await writeEncryptedRecordingFromChunks(outputPath, generateChunks(), key);
    const roundTrip = await readEncryptedRecording(outputPath, key);

    expect(size).toBe(11);
    expect(roundTrip.toString('utf-8')).toBe('hello world');
  });
});
