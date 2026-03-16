type MimeSupportChecker = (mimeType: string) => boolean;

const BASE_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, min: 640 },
  height: { ideal: 720, min: 480 },
  frameRate: { ideal: 30, max: 60 },
};

const RECORDING_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export function buildCameraConstraintCandidates(preferredDeviceId?: string): MediaStreamConstraints[] {
  const fallbackConstraint = {
    video: BASE_VIDEO_CONSTRAINTS,
    audio: false,
  };

  if (!preferredDeviceId) {
    return [fallbackConstraint];
  }

  return [
    {
      video: {
        ...BASE_VIDEO_CONSTRAINTS,
        deviceId: { ideal: preferredDeviceId },
      },
      audio: false,
    },
    fallbackConstraint,
  ];
}

export function selectRecordingMimeType(
  isTypeSupported: MimeSupportChecker = (mimeType) =>
    typeof MediaRecorder !== 'undefined' &&
    typeof MediaRecorder.isTypeSupported === 'function' &&
    MediaRecorder.isTypeSupported(mimeType)
) {
  return RECORDING_MIME_TYPES.find((mimeType) => isTypeSupported(mimeType)) ?? 'video/webm';
}
