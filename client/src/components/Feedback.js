import React, { useRef } from 'react';
import { useLocation, Navigate } from 'react-router-dom';

const getEmotionColor = (emotion) => {
  const colors = {
    happy: '#34D399',
    neutral: '#94A3B8',
    sad: '#60A5FA',
    angry: '#F87171',
    surprise: '#FBBF24',
    fear: '#A78BFA',
    disgust: '#818CF8'
  };
  return colors[emotion] || '#CBD5E1';
};

const Feedback = () => {
  const location = useLocation();
  const videoRef = useRef(null);

  if (!location.state || !location.state.feedback) {
    return <Navigate to="/" />;
  }

  const { feedback, interviewHistory, videoUrl, emotionTimestamps } = location.state;

  const jumpToTimestamp = (timestamp) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp / 1000;
      videoRef.current.play();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Interview Feedback</h1>

        {videoUrl && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Interview Recording</h2>
            <video
              ref={videoRef}
              controls
              src={videoUrl}
              className="w-full aspect-video rounded-lg mb-4"
            />
            
            <h3 className="text-lg font-semibold mb-2">Emotion Timeline</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {emotionTimestamps?.map((entry, index) => (
                <button
                  key={index}
                  onClick={() => jumpToTimestamp(entry.timestamp)}
                  className="px-3 py-1 rounded-full text-sm border border-gray-200 hover:shadow-md transition-shadow"
                  style={{ backgroundColor: getEmotionColor(entry.emotion) }}
                >
                  {Math.round(entry.timestamp/1000)}s: {entry.emotion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Overall Performance</h2>
            <p className="text-gray-700">{feedback.overallPerformance}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Speech Analysis</h2>
            <p className="text-gray-700">{feedback.speechAnalysis}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Areas of Improvement</h2>
            <ul className="list-disc pl-5 space-y-2">
              {feedback.areasOfImprovement.map((area, index) => (
                <li key={index} className="text-gray-700">{area}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Strengths</h2>
            <ul className="list-disc pl-5 space-y-2">
              {feedback.strengths.map((strength, index) => (
                <li key={index} className="text-gray-700">{strength}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Interview History</h2>
            <div className="space-y-4">
              {interviewHistory.map((item, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <strong className={`block mb-1 ${item.type === 'question' ? 'text-blue-600' : 'text-green-600'}`}>
                    {item.type === 'question' ? 'Interviewer Question:' : 'Your Answer:'}
                  </strong>
                  <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;