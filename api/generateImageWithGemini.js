// In /api/generateImageWithGemini.js
const fetch = require('node-fetch');

export default async function handler(req, res) {
  const { prompt } = req.body;
  const apiKey = process.env.GOOGLE_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;

  try {
    const payload = {
      contents: [{ parts: [{ "text": prompt }] }],
      generationConfig: {
        "responseModalities": ["TEXT", "IMAGE"]
      },
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `Google API Error: ${errorText}` });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
}