import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';

const Feedback = () => {
  const location = useLocation();
  
  if (!location.state || !location.state.feedback) {
    return <Navigate to="/" />;
  }

  const { feedback, interviewHistory } = location.state;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Interview Feedback</h1>
        
        <h2 className="text-xl font-semibold mt-4">Overall Performance</h2>
        <p>{feedback.feedback.overallPerformance}</p>
        
        <h2 className="text-xl font-semibold mt-4">Speech Analysis</h2>
        <p>{feedback.feedback.speechAnalysis}</p>
        
        <h2 className="text-xl font-semibold mt-4">Eye Contact Analysis</h2>
        <p>{feedback.feedback.eyeContactAnalysis}</p>
        
        <h2 className="text-xl font-semibold mt-4">Stress and Anxiety Insights</h2>
        <p>{feedback.feedback.stressAnxietyInsights}</p>
        
        <h2 className="text-xl font-semibold mt-4">Areas of Improvement</h2>
        <ul className="list-disc pl-5">
          {feedback.feedback.areasOfImprovement.map((area, index) => (
            <li key={index}>{area}</li>
          ))}
        </ul>
        
        <h2 className="text-xl font-semibold mt-4">Strengths</h2>
        <ul className="list-disc pl-5">
          {feedback.feedback.strengths.map((strength, index) => (
            <li key={index}>{strength}</li>
          ))}
        </ul>
        
        <h2 className="text-xl font-semibold mt-4">Interview History</h2>
        {interviewHistory.map((item, index) => (
          <div key={index} className="mb-2">
            <strong>{item.type === 'question' ? 'Q: ' : 'A: '}</strong>
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feedback;