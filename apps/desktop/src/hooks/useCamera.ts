import { useState, useRef, useEffect, useCallback } from 'react';

export function useCamera() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devs) => {
      const videoDevices = devs.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    });
  }, []);

  const startPreview = useCallback(
    async (deviceId?: string) => {
      try {
        // Stop existing stream
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId:
              deviceId || selectedDeviceId ? { exact: deviceId || selectedDeviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setStream(newStream);
        setError('');
        return newStream;
      } catch (err) {
        setError('Camera access denied or unavailable');
        return null;
      }
    },
    [selectedDeviceId, stream]
  );

  const stopPreview = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    stream,
    error,
    videoRef,
    startPreview,
    stopPreview,
  };
}
