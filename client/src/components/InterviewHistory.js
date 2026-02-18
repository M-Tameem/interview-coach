import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
      }
      setLoading(false);
    };
    fetchInterviews();
  }, []);

  return (
    <div className="page-gradient">
      <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
        {/* Back button */}
        <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Interview History</h1>
          <p className="text-slate-500">Review your past interview performances</p>
        </div>

        {loading ? (
          /* Loading skeletons */
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="section-card">
                <div className="skeleton h-5 w-40 mb-3" />
                <div className="skeleton h-4 w-24 mb-4" />
                <div className="skeleton h-4 w-full mb-2" />
                <div className="skeleton h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : interviews.length === 0 ? (
          /* Empty state */
          <div className="section-card text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-2">No interviews yet</h2>
            <p className="text-slate-500 mb-6">Complete your first practice interview to see it here</p>
            <Link to="/" className="btn-primary inline-flex items-center gap-2">
              Start Your First Interview
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview, index) => (
              <div key={interview.id} className="section-card hover:shadow-md transition-shadow duration-200 animate-slide-up">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Interview {interviews.length - index}</h3>
                    <p className="text-sm text-slate-400">
                      {interview.timestamp?.toDate
                        ? new Date(interview.timestamp.toDate()).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Date unavailable'}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-primary-50 text-primary-600">
                    #{interviews.length - index}
                  </span>
                </div>

                {interview.feedback && (
                  <div className="space-y-4">
                    <p className="text-slate-600 text-sm leading-relaxed">{interview.feedback.overallPerformance}</p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {interview.feedback.strengths?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-accent-600 uppercase tracking-wider mb-2">Strengths</h4>
                          <ul className="space-y-1.5">
                            {interview.feedback.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-400 flex-shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {interview.feedback.areasOfImprovement?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Improve</h4>
                          <ul className="space-y-1.5">
                            {interview.feedback.areasOfImprovement.map((a, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewHistory;
