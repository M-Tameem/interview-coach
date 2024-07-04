import React, { useState, useEffect } from 'react';
import { auth, getInterviewHistory } from './firebase';

const InterviewHistory = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviews = async () => {
      const user = auth.currentUser;
      if (user) {
        const interviewHistory = await getInterviewHistory(user.uid);
        setInterviews(interviewHistory);
        setLoading(false);
      }
    };
    fetchInterviews();
  }, []);

  if (loading) {
    return <div>Loading interview history...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Interview History</h2>
      {interviews.length === 0 ? (
        <p>No previous interviews found.</p>
      ) : (
        <ul className="space-y-4">
          {interviews.map((interview, index) => (
            <li key={interview.id} className="bg-white shadow rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">Interview {index + 1}</h3>
              <p className="text-gray-600 mb-2">Date: {new Date(interview.timestamp.toDate()).toLocaleString()}</p>
              <h4 className="font-semibold mt-4 mb-2">Feedback:</h4>
              <p>{interview.feedback.overallPerformance}</p>
              <h4 className="font-semibold mt-4 mb-2">Areas of Improvement:</h4>
              <ul className="list-disc list-inside">
                {interview.feedback.areasOfImprovement.map((area, i) => (
                  <li key={i}>{area}</li>
                ))}
              </ul>
              <h4 className="font-semibold mt-4 mb-2">Strengths:</h4>
              <ul className="list-disc list-inside">
                {interview.feedback.strengths.map((strength, i) => (
                  <li key={i}>{strength}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InterviewHistory;