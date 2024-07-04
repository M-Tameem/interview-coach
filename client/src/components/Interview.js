import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { saveInterviewFeedback } from './firebase';
import { auth } from './firebase';

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

  const videoRef = useRef(null);
  const selfViewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('interviewData'));
    if (!data) {
      navigate('/', { state: { error: 'Missing interview data. Please try again.' } });
      return;
    }
    setInterviewData(data);
    setTimeRemaining(data.duration * 60);
  }, [navigate]);

  useEffect(() => {
    if (timeRemaining > 0 && isRecording) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && isRecording) {
      endInterview();
    }
  }, [timeRemaining, isRecording]);

  const startInterview = async () => {
    try {
      await startRecording();
      const response = await axios.post('/api/start-interview', interviewData);
      setCurrentQuestion(response.data.question);
      setInterviewHistory([{ type: 'question', content: response.data.question }]);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting interview:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      if (selfViewRef.current) {
        selfViewRef.current.srcObject = stream;
        selfViewRef.current.play();
      }
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.start(1000);

      startSpeechRecognition();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event) => {
        const currentTranscript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(currentTranscript);
      };
      recognitionRef.current.start();
    } else {
      console.error('Speech recognition not supported in this browser');
    }
  };

  const handleAnswerSubmit = async () => {
    if (!transcript.trim()) return;
    setInterviewHistory(prev => [...prev, { type: 'answer', content: transcript }]);
    try {
      const response = await axios.post('/api/next-question', {
        interviewHistory: [...interviewHistory, { type: 'answer', content: transcript }],
        answer: transcript
      });
      setCurrentQuestion(response.data.question);
      setInterviewHistory(prev => [...prev, { type: 'question', content: response.data.question }]);
      setTranscript('');
    } catch (error) {
      console.error('Error getting next question:', error);
    }
  };

  const endInterview = async () => {
    setIsInterviewEnded(true);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('video', blob, 'interview.webm');
    formData.append('interviewData', JSON.stringify({ interviewHistory }));
    
    try {
      const response = await axios.post('/api/analyze-interview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const user = auth.currentUser;
      if (user) {
        await saveInterviewFeedback(user.uid, response.data);
      }

      console.log("Navigating to feedback page with data:", response.data);
      navigate('/feedback', { state: { feedback: response.data, interviewHistory } });
    } catch (error) {
      console.error('Error analyzing interview:', error);
      alert('An error occurred while analyzing the interview. Please try again.');
      navigate('/');
    }
  };

  if (isInterviewEnded) {
    return <div>Interview ended. Analyzing results...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Interview</h2>
        {!isRecording ? (
          <button onClick={startInterview} className="w-full bg-blue-500 text-white p-2 rounded">Begin Interview</button>
        ) : (
          <>
            <div className="text-lg mb-4">Time Remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</div>
            <div className="flex justify-between mb-4">
              <video ref={videoRef} autoPlay playsInline className="w-1/2 border border-gray-300 rounded" />
              <video ref={selfViewRef} autoPlay playsInline muted className="w-1/2 border border-gray-300 rounded" />
            </div>
            <div className="mb-4">
              <h3 className="font-semibold">Current Question:</h3>
              <p>{currentQuestion}</p>
            </div>
            {showTranscript && (
              <div className="mb-4">
                <h3 className="font-semibold">Live Transcription:</h3>
                <p>{transcript}</p>
              </div>
            )}
            <button onClick={() => setShowTranscript(!showTranscript)} className="w-full bg-blue-500 text-white p-2 rounded mb-4">
              {showTranscript ? 'Hide Transcription' : 'Show Transcription'}
            </button>
            <button onClick={handleAnswerSubmit} className="w-full bg-green-500 text-white p-2 rounded mb-4">Next Question</button>
            <button onClick={endInterview} className="w-full bg-red-500 text-white p-2 rounded">End Interview</button>
          </>
        )}
      </div>
    </div>
  );
};

export default Interview;