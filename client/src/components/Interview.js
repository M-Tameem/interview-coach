import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { saveInterviewFeedback, auth } from './firebase';
import * as tf from '@tensorflow/tfjs';

const emotionLabels = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"];

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
  const [recordedChunks, setRecordedChunks] = useState([]);

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const startTimeRef = useRef(null);
  const inferenceIntervalRef = useRef(null);
  const localStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Load TF.js model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = await tf.loadLayersModel('/models/mobilenet_fer2013/model.json');
        setModel(model);
      } catch (error) {
        console.error('Error loading model:', error);
        alert('Failed to load AI model. Please refresh the page.');
      }
    };
    loadModel();
  }, []);

  // Initialize interview data
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('interviewData'));
    if (!data) navigate('/');
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

  // Video setup
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play();
      }
      localStreamRef.current = stream;
    } catch (err) {
      console.error('Camera error:', err);
      alert('Enable camera/microphone permissions and use HTTPS!');
    }
  };

  // Emotion detection with timestamps
  const detectEmotion = async () => {
    if (!model || !videoRef.current) return;

    try {
      const video = videoRef.current;
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
      setEmotionTimestamps(prev => [...prev, { emotion, timestamp }]);
    } catch (err) {
      console.error('Emotion detection failed:', err);
    }
  };

  // Start interview
  const startInterview = async () => {
    await startVideo();
    startTimeRef.current = Date.now();

    // Setup media recorder
    const stream = videoRef.current.srcObject;
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) setRecordedChunks(prev => [...prev, e.data]);
    };
    mediaRecorderRef.current.start(1000);

    // Setup speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(transcript);
      };
      recognitionRef.current.start();
    }

    // Start question flow
    try {
      const response = await axios.post('/api/start-interview', interviewData);
      setCurrentQuestion(response.data.question);
      setInterviewHistory([{ type: 'question', content: response.data.question }]);
      setIsRecording(true);
      inferenceIntervalRef.current = setInterval(detectEmotion, 3000);
    } catch (err) {
      console.error('Interview start failed:', err);
      alert('Failed to start interview. Please try again.');
    }
  };

  // Handle answer submission
  const handleAnswerSubmit = async () => {
    if (!transcript.trim()) return;
    
    try {
      const newHistory = [...interviewHistory, { type: 'answer', content: transcript }];
      const response = await axios.post('/api/next-question', {
        interviewHistory: newHistory,
        answer: transcript
      });
      
      setCurrentQuestion(response.data.question);
      setInterviewHistory([...newHistory, { type: 'question', content: response.data.question }]);
      setTranscript(''); // Reset transcript
    } catch (err) {
      console.error('Answer submission error:', err);
    }
  };

  // End interview
  const endInterview = async () => {
    setIsInterviewEnded(true);
    setIsRecording(false);
    clearInterval(inferenceIntervalRef.current);
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);

      try {
        const response = await axios.post('/api/analyze-interview', {
          interviewHistory,
          emotionPredictions: emotionTimestamps
        });

        if (auth.currentUser) {
          await saveInterviewFeedback(auth.currentUser.uid, {
            ...response.data,
            videoUrl,
            emotionTimestamps
          });
        }
        
        navigate('/feedback', { 
          state: {
            ...response.data,
            videoUrl,
            emotionTimestamps,
            interviewHistory
          }
        });
      } catch (err) {
        console.error('Analysis failed:', err);
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Live Interview</h1>
        
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full aspect-video rounded-lg mb-6 ${isRecording ? 'bg-gray-800' : 'hidden'}`}
        />

        {!isRecording ? (
          <button
            onClick={startInterview}
            className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Interview
          </button>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="text-xl font-semibold">
                Time Remaining: {Math.floor(timeRemaining / 60)}:
                {(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
              <button
                onClick={endInterview}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                End Interview
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Current Question:</h3>
              <p className="text-gray-800">{currentQuestion}</p>
            </div>

            {showTranscript && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Live Transcription:</h3>
                <p className="text-gray-800 whitespace-pre-wrap">{transcript}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleAnswerSubmit}
                className="flex-1 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Submit Answer
              </button>
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Interview;