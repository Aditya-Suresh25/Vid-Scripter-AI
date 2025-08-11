// Example backend code for: /api/generateScript.js

export default async function handler(req, res) {
  // 1. Get the prompt that the frontend sent in the request body
  const { prompt } = req.body;

  // 2. Get your secret API key from server environment variables
  const apiKey = process.env.GOOGLE_API_KEY; 

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  try {
    // 3. Create the payload for the Google API
    const payload = { 
      contents: [{ role: "user", parts: [{ text: prompt }] }] 
    };

    // 4. Call the actual Google API from your server
    const externalApiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!externalApiResponse.ok) {
      const errorText = await externalApiResponse.text();
      return res.status(externalApiResponse.status).json({ error: `Google API Error: ${errorText}` });
    }

    const data = await externalApiResponse.json();

    // 5. Send the successful response back to your frontend
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
}