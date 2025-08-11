// In server/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config()
const app = express();
const PORT = 3001; // The port your backend server will run on

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Allow the server to understand JSON

// Get the API Key from the .env file
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Endpoint for Script and Hashtag Generation
app.post('/api/generateText', async (req, res) => {
  const { prompt } = req.body;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// In server/server.js

app.post('/api/generateImageWithGemini', async (req, res) => {
  console.log('Received request for Gemini Image Generation');
  const { prompt } = req.body;
  const apiKey = process.env.GOOGLE_API_KEY;
  
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;

  try {
    // CORRECTED PAYLOAD
    const payload = {
      contents: [{
        parts: [{ "text": prompt }]
      }],
      generationConfig: {
        // This is the required change: Request both TEXT and IMAGE
        "responseModalities": ["TEXT", "IMAGE"] 
      },
    };

    const externalApiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!externalApiResponse.ok) {
      const errorText = await externalApiResponse.text();
      console.error('Google API Error:', errorText);
      throw new Error(`Google API Error: ${errorText}`);
    }

    const data = await externalApiResponse.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Caught error in /api/generateImageWithGemini:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});