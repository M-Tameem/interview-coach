import React, { useRef, useState } from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';

const emotionColors = {
  happy: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  neutral: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  sad: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  angry: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400' },
  surprise: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  fear: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400' },
  disgust: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-400' },
};

const getEmotionStyle = (emotion) => emotionColors[emotion] || emotionColors.neutral;

const Feedback = () => {
  const location = useLocation();
  const videoRef = useRef(null);
  const [showTranscript, setShowTranscript] = useState(false);

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

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `interview-${new Date().toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="page-gradient">
      <div className="max-w-5xl mx-auto px-4 py-12 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-500 shadow-lg shadow-accent-500/30 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Interview Complete</h1>
          <p className="text-slate-500">Here's your AI-powered feedback</p>
        </div>

        {/* Video & Emotions */}
        {videoUrl && (
          <div className="section-card mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Recording</h2>
              <button
                onClick={handleDownload}
                className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
            <video
              ref={videoRef}
              controls
              src={videoUrl}
              className="w-full aspect-video rounded-xl bg-slate-900"
            />

            {/* Emotion Timeline */}
            {emotionTimestamps?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wider">Emotion Timeline</h3>
                <div className="flex flex-wrap gap-1.5">
                  {emotionTimestamps.map((entry, index) => {
                    const style = getEmotionStyle(entry.emotion);
                    return (
                      <button
                        key={index}
                        onClick={() => jumpToTimestamp(entry.timestamp)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
                          ${style.bg} ${style.text} hover:shadow-md transition-all duration-200 hover:scale-105`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {Math.round(entry.timestamp / 1000)}s {entry.emotion}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Overall Performance */}
          <div className="section-card animate-slide-up md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Overall Performance</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">{feedback.overallPerformance}</p>
          </div>

          {/* Speech Analysis */}
          {feedback.speechAnalysis && (
            <div className="section-card animate-slide-up md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Speech Analysis</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">{feedback.speechAnalysis}</p>
            </div>
          )}

          {/* Strengths */}
          {feedback.strengths?.length > 0 && (
            <div className="section-card animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Strengths</h2>
              </div>
              <ul className="space-y-3">
                {feedback.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-accent-400 flex-shrink-0" />
                    <span className="text-slate-600">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas of Improvement */}
          {feedback.areasOfImprovement?.length > 0 && (
            <div className="section-card animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Areas to Improve</h2>
              </div>
              <ul className="space-y-3">
                {feedback.areasOfImprovement.map((area, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-slate-600">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Transcript (collapsible) */}
        {interviewHistory?.length > 0 && (
          <div className="section-card mb-6 animate-slide-up">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Interview Transcript</h2>
              </div>
              <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showTranscript ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTranscript && (
              <div className="mt-4 space-y-3 animate-fade-in">
                {interviewHistory.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl ${
                      item.type === 'question'
                        ? 'bg-primary-50 border border-primary-100'
                        : 'bg-slate-50 border border-slate-100'
                    }`}
                  >
                    <span className={`text-xs font-semibold uppercase tracking-wider mb-1 block
                      ${item.type === 'question' ? 'text-primary-600' : 'text-slate-500'}`}>
                      {item.type === 'question' ? 'Interviewer' : 'You'}
                    </span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Start New Interview
          </Link>
          <Link to="/interview-history" className="btn-secondary flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View History
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
