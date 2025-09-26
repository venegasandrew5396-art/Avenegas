'use client';
import { useState, useRef, useEffect } from 'react';

const MODEL_NAME = 'gpt-5'; // label only

// ---------- API helpers ----------
async function sendChat(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data.message; // { role, content }
}

async function generateImage(prompt, size = '1024x1024') {
  const res = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, size }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);

  const b64 = data.b64;
  if (!b64 || typeof b64 !== 'string') throw new Error('No image data returned');

  // base64 -> Blob -> blob: URL for reliable rendering
  const byteChars = atob(b64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNums);
  const blob = new Blob([byteArray], { type: 'image/png' });
  return URL.createObjectURL(blob);
}

// ---------- Main UI ----------
export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Welcome to VenegasAI — to start, just type a message below." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);

    // Accepts: "/img …", "/image …", "create image …", "create an image …", "create image of …"
    const IMG_RE = /^(?:\/(?:img|image)|create(?:\s+an)?\s+image(?:\s+of)?)\s+/i;

    if (IMG_RE.test(text)) {
      const prompt = text.replace(IMG_RE, '').trim();
      if (!prompt) {
        setMessages((m) => [...m, { role: 'assistant', content: 'Image error: please add a prompt after your command' }]);
        setLoading(false);
        return;
      }
      setMessages((m) => [...m, { role: 'user', content: text }]);
      try {
        const src = await generateImage(prompt, '1024x1024');
        setMessages((m) => [...m, { role: 'assistant', image: src, alt: prompt }]);
      } catch (e) {
        setMessages((m) => [...m, { role: 'assistant', content: `Image error: ${e.message}` }]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // normal chat
    const userMsg = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);

    try {
      const reply = await sendChat([...messages.filter(m => typeof m.content === 'string' && !m.image), userMsg]);
      setMessages((m) => [...m, { role: 'assistant', content: reply.content }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Server error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>VenegasAI</div>

      <div style={styles.card}>
        <div style={styles.titleRow}>
          <div style={styles.title}>Chat</div>
        </div>

        <div ref={scrollRef} style={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} style={{ ...styles.msg, ...(m.role === 'user' ? styles.user : styles.assistant) }}>
              <strong style={{ opacity: .85 }}>{m.role === 'user' ? 'You' : 'Assistant'}:</strong>{' '}
              {m.image ? (
                <img
                  src={m.image}
                  alt={m.alt || 'generated'}
                  style={styles.image}
                  onError={(e) => {
                    e.currentTarget.replaceWith(
                      Object.assign(document.createElement('div'), {
                        textContent: 'Image error: failed to render image',
                        style: 'color:#f99'
                      })
                    );
                  }}
                />
              ) : (
                <span>{m.content}</span>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.msg, ...styles.assistant }}>
              <strong>Assistant:</strong> <span>…thinking</span>
            </div>
          )}
        </div>

        <div style={styles.inputRow}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Start chatting… or type 'create image' to generate one"
            style={styles.textarea}
            rows={1}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()} style={styles.button}>
            Send
          </button>
        </div>

        <div style={styles.footerNote}>Model: {MODEL_NAME}</div>
      </div>
    </div>
  );
}

// ---------- Styles ----------
const styles = {
  page: {
    minHeight: '100vh',
    background: '#07140f', // dark site bg
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 24
  },
  header: {
    fontWeight: 800,
    letterSpacing: .4,
    marginBottom: 12,
    color: '#d4b866' // gold accent
  },
  card: {
    width: '100%',
    maxWidth: 720,
    background: '#0e1f17', // dark green panel
    border: '1px solid #143426',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 8px 20px rgba(0,0,0,.35)'
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8
  },
  title: { fontSize: 28, fontWeight: 700 },
  messages: {
    height: '55vh',
    overflowY: 'auto',
    padding: '8px 6px',
    background: '#10241b',
    borderRadius: 8,
    border: '1px solid #143426',
    marginBottom: 12
  },
  msg: { margin: '10px 0', lineHeight: 1.5 },
  user: { color: '#ffffff' },
  assistant: { color: '#b8d1c1' },
  image: { maxWidth: '100%', borderRadius: 8, border: '1px solid #143426', marginTop: 6 },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  textarea: {
    flex: 1,
    resize: 'none',
    background: '#143426', // input bg
    color: '#ffffff',
    border: '1px solid #1f3d2d',
    borderRadius: 8,
    padding: '12px 14px',
    outline: 'none',
    fontSize: 15,
    lineHeight: 1.4
  },
  button: {
    padding: '12px 18px',
    borderRadius: 8,
    border: '1px solid #b79b4f',
    background: '#d4b866', // gold
    color: '#092015',
    fontWeight: 700,
    cursor: 'pointer'
  },
  footerNote: { marginTop: 6, fontSize: 12, opacity: .7 }
};
