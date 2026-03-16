import { useState, useRef, useEffect, useCallback } from 'react';
import { buildCameraConstraintCandidates } from '../lib/camera-utils';

export function useCamera() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const noCameraMessage = 'No cameras detected. Please connect a webcam.';

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDevices([]);
      setError(noCameraMessage);
      return;
    }

    const devs = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devs.filter((d) => d.kind === 'videoinput');
    if (videoDevices.length === 0) {
      setDevices([]);
      setSelectedDeviceId('');
      setError(noCameraMessage);
      return;
    }

    setDevices(videoDevices);
    if (videoDevices.length > 0 && !videoDevices.some((device) => device.deviceId === selectedDeviceId)) {
      setSelectedDeviceId(videoDevices[0].deviceId);
    }
    setError((current) => (current === noCameraMessage ? '' : current));
  }, [selectedDeviceId]);

  useEffect(() => {
    void refreshDevices();

    if (!navigator.mediaDevices?.addEventListener) {
      return;
    }

    const handleDeviceChange = () => {
      void refreshDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  const startPreview = useCallback(
    async (deviceId?: string) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is unavailable on this device');
        return null;
      }

      try {
        // Stop existing stream
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }

        const candidates = buildCameraConstraintCandidates(deviceId || selectedDeviceId || undefined);
        let newStream: MediaStream | null = null;
        let lastError: unknown = null;

        for (const constraints of candidates) {
          try {
            newStream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!newStream) {
          throw lastError || new Error('Camera access denied or unavailable');
        }

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        await refreshDevices();
        setStream(newStream);
        setError('');
        return newStream;
      } catch (err) {
        setError('Camera access denied or unavailable');
        return null;
      }
    },
    [refreshDevices, selectedDeviceId, stream]
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
