import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
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

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (user) {
        const data = await getUserData(user.uid);
        if (data) {
          setName(data.name);
          setPronouns(data.pronouns);
          setResumeText(data.resumeText || '');
        }
      }
    };
    fetchData();
  }, []);

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
  
    const formData = { uid: user.uid, name, pronouns, interviewType, resumeText, jobDescription, duration };
    await saveUserToFirestore(user, formData);
    localStorage.setItem('interviewData', JSON.stringify(formData));
    navigate('/device-check');  // Change this line to redirect to device check
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        const data = await getUserData(user.uid);
        if (data) {
          setName(data.name);
          setPronouns(data.pronouns);
          setResumeText(data.resumeText || '');
        }
      }
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4">AI Interview Coach</h1>
        <button onClick={handleGoogleSignIn} className="w-full bg-red-500 text-white p-2 rounded mb-4">Sign in with Google (necessary to start interview)</button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <select
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="she/her">she/her</option>
            <option value="he/him">he/him</option>
            <option value="they/them">they/them</option>
          </select>
          <select
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="behavioral">Behavioral</option>
            <option value="technical">Technical</option>
          </select>
          <input
            type="file"
            accept=".pdf"
            onChange={handleResumeUpload}
            className="w-full p-2 border border-gray-300 rounded"
          />
          {resumeText && (
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Parsed resume text"
              rows={10}
              className="w-full p-2 border border-gray-300 rounded"
            />
          )}
          <textarea
            placeholder="Job Description"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="number"
            min="3"
            max="30"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Start Interview</button>
        </form>
        <Link to="/interview-history" className="block mt-4 text-center bg-green-500 text-white px-4 py-2 rounded">
          View Interview History
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;