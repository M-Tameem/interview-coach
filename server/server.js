const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const { OpenAI } = require('openai');
const fs = require('fs');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/parse-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(dataBuffer);

    fs.unlinkSync(req.file.path);

    res.json({ text: data.text });
  } catch (error) {
    console.error('Error parsing resume:', error);
    res.status(500).json({ error: 'Error parsing resume' });
  }
});

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

app.post('/api/analyze-interview', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const videoPath = req.file.path;
  const interviewData = JSON.parse(req.body.interviewData);

  const pythonProcess = spawn('python', [
    path.join(__dirname, 'analysis', 'video_speech_analysis.py'),
    videoPath,
  ]);

  let pythonData = '';
  pythonProcess.stdout.on('data', (data) => {
    pythonData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python script error: ${data}`);
  });

  pythonProcess.on('close', async (code) => {
    console.log(`Python script exited with code ${code}`);
    console.log('Python script output:', pythonData);

    if (code !== 0) {
      return res.status(500).json({ error: 'Error analyzing interview' });
    }

    try {
      let analysisResults;
      try {
        analysisResults = JSON.parse(pythonData);
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        return res.status(500).json({ error: 'Invalid analysis results', details: pythonData });
      }

      if (!analysisResults || typeof analysisResults !== 'object') {
        throw new Error('Invalid analysis results structure');
      }

      if (analysisResults.error) {
        throw new Error(analysisResults.error);
      }

      // Generate feedback using GPT
      const prompt = `Based on the following interview history and analysis results, provide detailed feedback for the candidate:

      Interview history:
      ${JSON.stringify(interviewData.interviewHistory)}

      Analysis results:
      ${JSON.stringify(analysisResults)}

      Please provide:
      1. Overall performance evaluation (2-3 sentences)
      2. Analysis of speech patterns, including tone and content (2-3 sentences)
      3. Analysis of eye contact and engagement (2-3 sentences)
      4. Insights on stress and anxiety levels during the interview (2-3 sentences)
      5. Areas of improvement (3-4 bullet points)
      6. Strengths demonstrated (3-4 bullet points)

      Format the response as a JSON object with keys: overallPerformance, speechAnalysis, eyeContactAnalysis, stressAnxietyInsights, areasOfImprovement, strengths.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });

      const feedback = JSON.parse(completion.choices[0].message.content);

      const feedbackData = {
        interviewHistory: interviewData.interviewHistory,
        analysisResults: analysisResults,
        feedback: feedback,
      };

      res.json(feedbackData);
    } catch (error) {
      console.error('Error analyzing interview:', error);
      res.status(500).json({ error: 'Error analyzing interview', details: error.message });
    } finally {
      // Clean up the uploaded video file
      fs.unlink(videoPath, (err) => {
        if (err) console.error('Error deleting video file:', err);
      });
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));