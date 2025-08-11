// In /api/generateText.js
const fetch = require('node-fetch');

export default async function handler(req, res) {
  // Get the prompt from the frontend request
  const { prompt } = req.body;
  
  // Get the secret API key from Vercel's environment variables
  const apiKey = process.env.GOOGLE_API_KEY;
  
  // The API endpoint for the Gemini text model
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  try {
    // Prepare the payload to send to the Google API
    const payload = { 
      contents: [{ role: "user", parts: [{ text: prompt }] }] 
    };

    // Call the Google API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Check for errors from the Google API
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `API Error: ${errorText}` });
    }

    // Send the successful response back to your React app
    const data = await response.json();
    res.status(200).json(data);
    
  } catch (error) {
    // Handle any other server-side errors
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
}