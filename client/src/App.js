import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Interview from './components/Interview';
import DeviceCheck from './components/DeviceCheck';
import Feedback from './components/Feedback';
import InterviewHistory from './components/InterviewHistory';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/device-check" element={<DeviceCheck />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/interview-history" element={<InterviewHistory />} />
      </Routes>
    </Router>
  );
}

export default App;