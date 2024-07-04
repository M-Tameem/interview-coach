import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DeviceCheck = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [stream, setStream] = useState(null);

  useEffect(() => {
    getDevices();
  }, []);

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);
      if (audioInputs.length) setSelectedAudio(audioInputs[0].deviceId);
      if (videoInputs.length) setSelectedVideo(videoInputs[0].deviceId);
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  };

  useEffect(() => {
    if (selectedAudio && selectedVideo) {
      startStream();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedAudio, selectedVideo]);

  const startStream = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedAudio },
        video: { deviceId: selectedVideo }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const handleContinue = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    localStorage.setItem('selectedDevices', JSON.stringify({ audio: selectedAudio, video: selectedVideo }));
    navigate('/interview');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Device Check</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-2">Microphone:</label>
            <select 
              value={selectedAudio} 
              onChange={(e) => setSelectedAudio(e.target.value)} 
              className="w-full p-2 border border-gray-300 rounded"
            >
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2">Camera:</label>
            <select 
              value={selectedVideo} 
              onChange={(e) => setSelectedVideo(e.target.value)} 
              className="w-full p-2 border border-gray-300 rounded"
            >
              {videoDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
          <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-md border border-gray-300 rounded" />
          <button onClick={handleContinue} className="w-full bg-blue-500 text-white p-2 rounded">Continue to Interview</button>
        </div>
      </div>
    </div>
  );
};

export default DeviceCheck;