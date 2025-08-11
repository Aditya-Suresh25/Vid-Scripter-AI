// Add this new route to your server/server.js file

app.post('/api/generateImageWithGemini', async (req, res) => {
  console.log('Received request for Gemini Image Generation');
  const { prompt } = req.body;
  const apiKey = process.env.GOOGLE_API_KEY;
  
  // Note the different model and endpoint
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;

  try {
    // The payload structure is different for this model
    const payload = {
      contents: [{
        parts: [{ "text": prompt }]
      }],
      generationConfig: {
        "responseModalities": ["IMAGE"]
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