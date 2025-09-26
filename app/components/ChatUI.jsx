'use client';
import { useState, useRef, useEffect } from 'react';

async function sendChat(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.message;
}

export default function ChatUI() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I’m ready when you are. Ask me anything." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', content: text };
    setMessages(m => [...m, userMsg]);

    try {
      const reply = await sendChat([...messages, userMsg]);
      setMessages(m => [...m, { role: 'assistant', content: reply.content }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `Server error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Chat</div>
      <div ref={listRef} style={{ height: '60vh', overflowY: 'auto', border: '1px solid #333', borderRadius: 8, padding: 12, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '10px 0' }}>
            <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong> {m.content}
          </div>
        ))}
        {loading && <div><strong>Assistant:</strong> …thinking</div>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type your message…"
          rows={1}
          style={{ flex: 1, borderRadius: 8, padding: 10, border: '1px solid #333' }}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} style={{ padding: '10px 16px', borderRadius: 8 }}>
          Send
        </button>
      </div>
    </div>
  );
}
