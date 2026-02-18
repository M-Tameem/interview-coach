import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { signOut } from 'firebase/auth';
import { auth, signInWithGoogle, getUserData, updateUserResume, saveUserToFirestore } from './firebase';

const LandingPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('they/them');
  const [interviewType, setInterviewType] = useState('behavioral');
  const [resume, setResume] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [duration, setDuration] = useState(15);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setIsSignedIn(!!user);
      if (user) {
        const data = await getUserData(user.uid);
        if (data) {
          setName(data.name || '');
          setPronouns(data.pronouns || 'they/them');
          setResumeText(data.resumeText || '');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleResumeUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') return;
    setIsParsingResume(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await axios.post('/api/parse-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResumeText(response.data.text);
      setResume(file);

      const user = auth.currentUser;
      if (user) {
        await updateUserResume(user.uid, response.data.text);
      }
    } catch (error) {
      console.error('Error parsing resume:', error);
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleResumeUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleResumeUpload(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setIsLoading(true);
    const formData = { uid: user.uid, name, pronouns, interviewType, resumeText, jobDescription, duration };
    await saveUserToFirestore(user, formData);
    localStorage.setItem('interviewData', JSON.stringify(formData));
    navigate('/device-check');
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        setIsSignedIn(true);
        const data = await getUserData(user.uid);
        if (data) {
          setName(data.name || '');
          setPronouns(data.pronouns || 'they/them');
          setResumeText(data.resumeText || '');
        }
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsSignedIn(false);
    setName('');
    setResumeText('');
  };

  const durationOptions = [5, 10, 15, 20, 30];

  return (
    <div className="page-gradient">
      <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/30 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Interview Coach</h1>
          <p className="text-slate-500 text-lg">Practice interviews with AI-powered feedback</p>
          {isSignedIn && (
            <button
              onClick={handleSignOut}
              className="mt-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          )}
        </div>

        {/* Sign In */}
        {!isSignedIn ? (
          <div className="section-card text-center animate-slide-up">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Get Started</h2>
            <p className="text-slate-500 mb-6">Sign in to save your progress and track improvement</p>
            <button
              onClick={handleGoogleSignIn}
              className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-xl
                         text-slate-700 font-medium shadow-sm hover:shadow-md hover:bg-slate-50
                         transition-all duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
            {/* Profile Section */}
            <div className="section-card">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">About You</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Pronouns</label>
                  <select
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    required
                    className="select-field"
                  >
                    <option value="she/her">she/her</option>
                    <option value="he/him">he/him</option>
                    <option value="they/them">they/them</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interview Setup */}
            <div className="section-card">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Interview Setup</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Interview Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['behavioral', 'technical'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setInterviewType(type)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium capitalize transition-all duration-200 border
                          ${interviewType === type
                            ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {type === 'behavioral' ? 'Behavioral' : 'Technical'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Duration</label>
                  <div className="flex gap-2">
                    {durationOptions.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border
                          ${duration === d
                            ? 'bg-primary-50 border-primary-300 text-primary-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resume Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Resume (PDF)</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer
                      ${dragActive
                        ? 'border-primary-400 bg-primary-50'
                        : resume || resumeText
                          ? 'border-accent-300 bg-accent-50'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {isParsingResume ? (
                      <div className="flex items-center justify-center gap-2 text-primary-600">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Parsing resume...
                      </div>
                    ) : resume || resumeText ? (
                      <div className="text-accent-600 font-medium">
                        <svg className="w-6 h-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {resume ? resume.name : 'Resume loaded'}
                        <span className="block text-sm text-slate-500 mt-1">Drop a new file to replace</span>
                      </div>
                    ) : (
                      <div className="text-slate-500">
                        <svg className="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span className="font-medium">Drop your resume here</span> or click to browse
                      </div>
                    )}
                  </div>
                </div>

                {resumeText && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Parsed Resume</label>
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Parsed resume text"
                      rows={6}
                      className="input-field text-sm font-mono resize-y"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Job Description</label>
                  <textarea
                    placeholder="Paste the job description you're preparing for..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                    rows={4}
                    className="input-field resize-y"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Preparing...
                  </>
                ) : (
                  <>
                    Start Interview
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>

              <Link
                to="/interview-history"
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View Interview History
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
