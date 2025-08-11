// Example backend code for: /api/generateHashtags.js
// This file is nearly identical to the script generator.

export default async function handler(req, res) {
  const { prompt } = req.body;
  const apiKey = process.env.GOOGLE_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  try {
    const payload = { 
      contents: [{ role: "user", parts: [{ text: prompt }] }] 
    };

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
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
}