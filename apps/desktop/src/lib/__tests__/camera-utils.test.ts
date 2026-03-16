import { describe, expect, it } from 'vitest';
import {
  buildCameraConstraintCandidates,
  selectRecordingMimeType,
} from '../camera-utils';

describe('camera utils', () => {
  it('tries the selected device first and then falls back to generic constraints', () => {
    const candidates = buildCameraConstraintCandidates('device-1');

    expect(candidates).toHaveLength(2);
    expect(candidates[0]?.video).toMatchObject({
      deviceId: { ideal: 'device-1' },
    });
    expect(candidates[1]?.video).not.toHaveProperty('deviceId');
  });

  it('uses the first supported WebM recording mime type', () => {
    const mimeType = selectRecordingMimeType((type) => type === 'video/webm');

    expect(mimeType).toBe('video/webm');
  });
});
