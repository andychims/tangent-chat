export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(503).json({ error: 'OPENROUTER_API_KEY not configured' });

  const { messages, model = 'anthropic/claude-sonnet-4.6', parentContext, excerpt } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' });

  let system = 'You are a helpful, thoughtful assistant. Be clear and accurate in your responses.';

  if (parentContext && excerpt) {
    system = `You are a helpful assistant. The user is asking a focused question about a specific passage from an ongoing AI conversation.

Parent conversation:
${parentContext}

The user highlighted this specific text from the conversation:
"${excerpt}"

Answer the user's question about this highlighted passage. Use the full parent conversation as context when relevant, but keep your focus on what was highlighted.`;
  }

  const body = {
    model,
    stream: true,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: system },
      ...messages.map(({ role, content }) => ({ role, content })),
    ],
  };

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tangent-chat.vercel.app',
        'X-Title': 'Tangent',
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({ error: err?.error?.message || 'OpenRouter error' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();
    const dec = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        try {
          const chunk = JSON.parse(payload);
          const text = chunk.choices?.[0]?.delta?.content;
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
        } catch {}
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to get response' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
}
