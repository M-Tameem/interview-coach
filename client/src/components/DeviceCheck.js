import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const DeviceCheck = () => {
  const navigate = useNavigate();
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const videoPreviewRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const startPreview = useCallback(async (audioId, videoId) => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    try {
      const constraints = {
        video: videoId ? { deviceId: { exact: videoId } } : true,
        audio: audioId ? { deviceId: { exact: audioId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      // Audio level metering
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(avg / 128, 1));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error('Preview error:', err);
    }
  }, []);

  // Request permissions and enumerate devices
  useEffect(() => {
    const init = async () => {
      try {
        // Must getUserMedia first so device labels are populated
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(t => t.stop());
        setPermissionGranted(true);

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAudioDevices(audioInputs);
        setVideoDevices(videoInputs);

        const defaultAudio = audioInputs[0]?.deviceId || '';
        const defaultVideo = videoInputs[0]?.deviceId || '';
        setSelectedAudio(defaultAudio);
        setSelectedVideo(defaultVideo);

        // Start preview with default devices
        if (defaultAudio || defaultVideo) {
          startPreview(defaultAudio, defaultVideo);
        }
      } catch (error) {
        console.error('Permission error:', error);
        setPermissionError(
          error.name === 'NotAllowedError'
            ? 'Camera and microphone access was denied. Please allow access in your browser settings.'
            : 'Could not access your camera or microphone. Make sure they are connected and try again.'
        );
      }
    };
    init();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [startPreview]);

  const handleAudioChange = (deviceId) => {
    setSelectedAudio(deviceId);
    startPreview(deviceId, selectedVideo);
  };

  const handleVideoChange = (deviceId) => {
    setSelectedVideo(deviceId);
    startPreview(selectedAudio, deviceId);
  };

  const handleContinue = () => {
    // Stop preview stream before navigating
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    localStorage.setItem('selectedDevices', JSON.stringify({ audio: selectedAudio, video: selectedVideo }));
    navigate('/interview');
  };

  return (
    <div className="page-gradient">
      <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to setup
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Device Check</h1>
          <p className="text-slate-500">Make sure your camera and microphone are working</p>
        </div>

        {permissionError ? (
          <div className="section-card text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Permission Required</h2>
            <p className="text-slate-500 mb-4">{permissionError}</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Camera Preview */}
            <div className="section-card p-0 overflow-hidden">
              <div className="relative bg-slate-900 aspect-video">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!permissionGranted && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                      <svg className="w-10 h-10 mx-auto mb-2 animate-spin text-white/50" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-sm text-white/70">Requesting permissions...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audio Level */}
            {permissionGranted && (
              <div className="section-card">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-sm font-medium text-slate-600">Microphone Level</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-400 to-accent-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.max(audioLevel * 100, 2)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">Speak to test your microphone</p>
              </div>
            )}

            {/* Device Selection */}
            {permissionGranted && (
              <div className="section-card">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Select Devices</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Camera</label>
                    <select
                      value={selectedVideo}
                      onChange={(e) => handleVideoChange(e.target.value)}
                      className="select-field"
                    >
                      {videoDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Microphone</label>
                    <select
                      value={selectedAudio}
                      onChange={(e) => handleAudioChange(e.target.value)}
                      className="select-field"
                    >
                      {audioDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Continue */}
            {permissionGranted && (
              <button onClick={handleContinue} className="btn-primary w-full flex items-center justify-center gap-2">
                Continue to Interview
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceCheck;
