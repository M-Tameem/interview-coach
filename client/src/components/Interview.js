import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { saveInterviewFeedback, auth } from './firebase';
import * as tf from '@tensorflow/tfjs';

const emotionLabels = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"];

// Check browser compatibility
const isSpeechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Pick best supported MIME type for MediaRecorder
const getMediaRecorderMimeType = () => {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
};

const Interview = () => {
  const navigate = useNavigate();
  const [interviewData, setInterviewData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(true);
  const [isInterviewEnded, setIsInterviewEnded] = useState(false);
  const [model, setModel] = useState(null);
  const [emotionTimestamps, setEmotionTimestamps] = useState([]);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const startTimeRef = useRef(null);
  const inferenceIntervalRef = useRef(null);
  const localStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]); // Use ref instead of state to avoid stale closures
  const interviewHistoryRef = useRef([]); // Keep a ref in sync for the endInterview closure
  const emotionTimestampsRef = useRef([]);
  const endingRef = useRef(false); // Prevent double-ending

  // Keep refs in sync with state
  useEffect(() => { interviewHistoryRef.current = interviewHistory; }, [interviewHistory]);
  useEffect(() => { emotionTimestampsRef.current = emotionTimestamps; }, [emotionTimestamps]);

  // Load TF.js model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const m = await tf.loadLayersModel('/models/mobilenet_fer2013/model.json');
        setModel(m);
      } catch (error) {
        console.error('Error loading model:', error);
      }
    };
    loadModel();
  }, []);

  // Initialize interview data
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('interviewData'));
    if (!data) { navigate('/'); return; }
    setInterviewData(data);
    setTimeRemaining(data.duration * 60);
  }, [navigate]);

  // Handle timer
  useEffect(() => {
    let interval;
    if (isRecording && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(t => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, timeRemaining]);

  // Video setup — uses selected devices from DeviceCheck
  const startVideo = async () => {
    try {
      const devices = JSON.parse(localStorage.getItem('selectedDevices') || '{}');
      const constraints = {
        video: devices.video ? { deviceId: { exact: devices.video } } : { facingMode: 'user' },
        audio: devices.audio ? { deviceId: { exact: devices.audio } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play();
      }
      localStreamRef.current = stream;
    } catch (err) {
      console.error('Camera error:', err);
      alert('Could not access your camera/microphone. Please check your device settings and ensure you\'re using HTTPS.');
    }
  };

  // Emotion detection
  const detectEmotion = useCallback(async () => {
    if (!model || !videoRef.current) return;
    try {
      const video = videoRef.current;
      if (video.videoWidth === 0) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      let tensor = tf.browser.fromPixels(canvas)
        .resizeNearestNeighbor([48, 48])
        .toFloat()
        .div(255.0)
        .expandDims();

      const prediction = await model.predict(tensor).data();
      tensor.dispose();

      const emotion = emotionLabels[prediction.indexOf(Math.max(...prediction))];
      const timestamp = Date.now() - startTimeRef.current;
      setCurrentEmotion(emotion);
      setEmotionTimestamps(prev => [...prev, { emotion, timestamp }]);
    } catch (err) {
      console.error('Emotion detection failed:', err);
    }
  }, [model]);

  // End interview — wrapped in useCallback to use in the timer effect
  const endInterview = useCallback(async () => {
    if (endingRef.current || isInterviewEnded) return;
    endingRef.current = true;
    setIsInterviewEnded(true);
    setIsRecording(false);
    setIsAnalyzing(true);
    clearInterval(inferenceIntervalRef.current);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }

    localStreamRef.current?.getTracks().forEach(track => track.stop());

    // Wait for MediaRecorder to finish writing all chunks
    const videoUrl = await new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        // Already stopped or never started — build blob from what we have
        const blob = new Blob(recordedChunksRef.current, { type: getMediaRecorderMimeType() || 'video/webm' });
        resolve(URL.createObjectURL(blob));
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: getMediaRecorderMimeType() || 'video/webm' });
        resolve(URL.createObjectURL(blob));
      };
      recorder.stop();
    });

    try {
      const response = await axios.post('/api/analyze-interview', {
        interviewHistory: interviewHistoryRef.current,
        emotionPredictions: emotionTimestampsRef.current,
      });

      if (auth.currentUser) {
        await saveInterviewFeedback(auth.currentUser.uid, {
          ...response.data,
          emotionTimestamps: emotionTimestampsRef.current,
        });
      }

      navigate('/feedback', {
        state: {
          ...response.data,
          videoUrl,
          emotionTimestamps: emotionTimestampsRef.current,
          interviewHistory: interviewHistoryRef.current,
        },
      });
    } catch (err) {
      console.error('Analysis failed:', err);
      // Still navigate to feedback with what we have
      navigate('/feedback', {
        state: {
          feedback: {
            overallPerformance: 'Analysis could not be completed. Please try again.',
            speechAnalysis: '',
            areasOfImprovement: [],
            strengths: [],
          },
          videoUrl,
          emotionTimestamps: emotionTimestampsRef.current,
          interviewHistory: interviewHistoryRef.current,
        },
      });
    }
  }, [isInterviewEnded, navigate]);

  // Auto-end when timer reaches 0
  useEffect(() => {
    if (isRecording && timeRemaining <= 0) {
      endInterview();
    }
  }, [isRecording, timeRemaining, endInterview]);

  // Start interview
  const startInterview = async () => {
    await startVideo();
    startTimeRef.current = Date.now();
    recordedChunksRef.current = [];

    // Setup media recorder — use the stream from the ref (not the video element)
    const stream = localStreamRef.current;
    const mimeType = getMediaRecorderMimeType();
    const options = mimeType ? { mimeType } : {};
    const recorder = new MediaRecorder(stream, options);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;

    // Setup speech recognition
    if (isSpeechSupported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (e) => {
        const t = Array.from(e.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(t);
      };
      recognitionRef.current.onerror = (e) => {
        if (e.error !== 'aborted') console.error('Speech recognition error:', e.error);
      };
      recognitionRef.current.start();
    }

    // Start question flow
    setIsLoadingQuestion(true);
    try {
      const response = await axios.post('/api/start-interview', interviewData);
      setCurrentQuestion(response.data.question);
      setInterviewHistory([{ type: 'question', content: response.data.question }]);
      setIsRecording(true);
      inferenceIntervalRef.current = setInterval(detectEmotion, 3000);
    } catch (err) {
      console.error('Interview start failed:', err);
      alert('Failed to start interview. Please try again.');
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  // Handle answer submission
  const handleAnswerSubmit = async () => {
    if (!transcript.trim()) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }

    const newHistory = [
      ...interviewHistory,
      { type: 'answer', content: transcript },
    ];

    setIsLoadingQuestion(true);
    try {
      const response = await axios.post('/api/next-question', {
        interviewHistory: newHistory,
        answer: transcript,
      });

      setCurrentQuestion(response.data.question);
      setInterviewHistory([
        ...newHistory,
        { type: 'question', content: response.data.question },
      ]);
      setTranscript('');

      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) { /* ignore */ }
      }
    } catch (err) {
      console.error('Answer submission error:', err);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(inferenceIntervalRef.current);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  const timerMinutes = Math.floor(timeRemaining / 60);
  const timerSeconds = (timeRemaining % 60).toString().padStart(2, '0');
  const timerUrgent = timeRemaining < 60;
  const timerWarning = timeRemaining < 180 && !timerUrgent;

  // Analyzing overlay
  if (isAnalyzing) {
    return (
      <div className="page-gradient flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing Your Interview</h2>
          <p className="text-slate-500">This may take a moment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Browser warning */}
      {!isSpeechSupported && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm text-amber-800">
          Speech recognition is not supported in this browser. Please use Chrome or Edge for the best experience.
        </div>
      )}

      {/* Top bar */}
      {isRecording && (
        <div className="bg-slate-800/80 backdrop-blur border-b border-slate-700 px-6 py-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-recording-pulse" />
              <span className="text-sm font-medium text-slate-300">Recording</span>
            </span>
            {currentEmotion && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 capitalize">
                {currentEmotion}
              </span>
            )}
          </div>

          <div className={`text-lg font-mono font-bold tabular-nums
            ${timerUrgent ? 'text-red-400' : timerWarning ? 'text-amber-400' : 'text-white'}`}>
            {timerMinutes}:{timerSeconds}
          </div>

          <button onClick={endInterview} className="btn-danger text-sm px-4 py-2">
            End Interview
          </button>
        </div>
      )}

      {/* Hidden video element — always mounted so the ref is available for startVideo */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={isRecording ? 'hidden' : 'hidden'}
        // Shown via the visible copy below when recording; this element is only for stream capture
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!isRecording && !isInterviewEnded ? (
          /* Pre-interview start screen */
          <div className="text-center animate-fade-in max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Ready to Start?</h1>
            <p className="text-slate-400 mb-8">
              Your camera and microphone will be used during the interview.
              You'll have {interviewData?.duration || 15} minutes.
            </p>
            <button
              onClick={startInterview}
              disabled={isLoadingQuestion}
              className="btn-primary text-lg px-10 py-4"
            >
              {isLoadingQuestion ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Starting...
                </span>
              ) : (
                'Begin Interview'
              )}
            </button>
            <button
              onClick={() => navigate('/device-check')}
              className="block mx-auto mt-4 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Change camera/mic settings
            </button>
          </div>
        ) : isRecording && (
          /* Active interview */
          <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-4 animate-fade-in">
            {/* Video feed — mirrors the hidden capture element */}
            <div className="flex-1 relative">
              <video
                autoPlay
                muted
                playsInline
                ref={(el) => { if (el && localStreamRef.current) el.srcObject = localStreamRef.current; }}
                className="w-full aspect-video rounded-2xl bg-slate-800 object-cover shadow-2xl"
              />
            </div>

            {/* Side panel */}
            <div className="lg:w-96 flex flex-col gap-4">
              {/* Current Question */}
              <div className="glass-card p-5 bg-slate-800/90 border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Question</span>
                  {isLoadingQuestion && (
                    <svg className="w-4 h-4 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>
                <p className="text-white leading-relaxed">{currentQuestion}</p>
              </div>

              {/* Live Transcript */}
              {showTranscript && (
                <div className="glass-card p-5 bg-slate-800/90 border-slate-700 flex-1 min-h-[120px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-accent-400 uppercase tracking-wider">Your Answer</span>
                    <button
                      onClick={() => setShowTranscript(false)}
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {transcript || <span className="text-slate-500 italic">Start speaking...</span>}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleAnswerSubmit}
                  disabled={!transcript.trim() || isLoadingQuestion}
                  className="btn-accent flex-1 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Submit Answer
                </button>
                {!showTranscript && (
                  <button
                    onClick={() => setShowTranscript(true)}
                    className="px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
                    title="Show transcript"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Interview;
