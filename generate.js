export default async function handler(req, res) {
  // Allow requests from any origin for now, but you can restrict this to your domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Get the secret API key from Vercel's environment variables
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key is not configured.' });
  }

  // The request from the frontend will contain the 'type' (feedback or news) and the 'prompt'
  const { type, prompt } = req.body;

  if (!type || !prompt) {
    return res.status(400).json({ error: 'Missing type or prompt in request body.' });
  }

  // Use the correct API URL for Groq
  const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  
  // Choose a powerful model available on Groq, like Llama3.1
  const model = 'llama3.1-70b-versatile'; 

  try {
    const apiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: model,
        temperature: 0.7,
        n: 1,
        stream: false,
        response_format: { type: 'json_object' }, // Ask for JSON directly
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Groq API Error:', errorText);
      return res.status(apiResponse.status).json({ error: `Groq API error: ${errorText}` });
    }

    const data = await apiResponse.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
        return res.status(500).json({ error: 'Invalid response structure from Groq API.' });
    }

    // The AI's response is a JSON string, so we parse it before sending it back
    const jsonResponse = JSON.parse(content);
    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error('Internal Server Error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}
