export default async function handler(req, res) {
  console.log("Function /api/generateScript started.");

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: GOOGLE_API_KEY environment variable not found.");
    return res.status(500).json({ error: "Server configuration error: API key is missing." });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Bad Request: No prompt provided." });
  }
  
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
    });

    console.log(`Google API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error from Google API:", errorText);
      return res.status(response.status).json({ error: `Google API Error: ${errorText}` });
    }

    const data = await response.json();
    console.log("Successfully received data from Google.");
    res.status(200).json(data);

  } catch (error) {
    console.error("Caught a fatal error in the try-catch block:", error.message);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
}