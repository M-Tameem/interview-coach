const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { OpenAI } = require('openai');
const fs = require('fs');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Configure multer for resume uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

// Initialize OpenAI with your API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API endpoint to parse resume PDF
app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(dataBuffer);

    fs.unlinkSync(req.file.path); // Remove temp file

    res.json({ text: data.text });
  } catch (error) {
    console.error('Error parsing resume:', error);
    res.status(500).json({ error: 'Error parsing resume' });
  }
});

// API endpoint to start the interview
app.post('/api/start-interview', async (req, res) => {
  try {
    const { interviewType, resumeText, jobDescription } = req.body;

    const prompt = `You are an AI interview coach conducting a ${interviewType} interview. 
The candidate's resume states: "${resumeText}"
The job description is: "${jobDescription}"
Based on this information, provide the first relevant interview question.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }],
    });

    res.json({ question: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ error: 'Error starting interview' });
  }
});

// API endpoint to get the next interview question
app.post('/api/next-question', async (req, res) => {
  try {
    const { interviewHistory, answer } = req.body;

    const prompt = `You are conducting an interview. 
Based on the following interview history and the candidate's last answer, provide the next relevant interview question.

Interview history:
${JSON.stringify(interviewHistory)}

Candidate's last answer: ${answer}

Next question:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ question: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({ error: 'Error getting next question' });
  }
});

// API endpoint to analyze the interview
app.post('/api/analyze-interview', async (req, res) => {
  try {
    const interviewData = req.body;

    console.log('interview data:', interviewData);

    const prompt = `Based on the following interview history and the candidate's facial expression analysis, provide detailed feedback:

Interview history:
${JSON.stringify(interviewData.interviewHistory)}

Facial expression analysis:
${JSON.stringify(interviewData.emotionPredictions)}

Avoid being overly critical, do not assume too much about the candidate, and provide constructive feedback.
Provide JSON feedback with these keys:
- overallPerformance: 2-3 sentence evaluation
- speechAnalysis: Analyze responses and whether the user can be more concise or more lengthy, emphasize STAR method, etc.
- areasOfImprovement: 3-4 bullet points
- strengths: 3-4 bullet points

Format strictly as JSON with no markdown. Example:
{
  "overallPerformance": "...",
  "speechAnalysis": "...",
  "areasOfImprovement": ["..."],
  "strengths": ["..."]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const feedback = JSON.parse(completion.choices[0].message.content);

    res.json({
      interviewHistory: interviewData.interviewHistory,
      feedback: feedback
    });
  } catch (error) {
    console.error('Error analyzing interview:', error);
    res.status(500).json({ error: 'Error analyzing interview', details: error.message });
  }
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch-all handler to return the React app's index.html for any unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
