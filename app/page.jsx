'use client';
import { useState, useRef, useEffect } from 'react';

const MODEL_NAME = 'gpt-5'; // label only for footer

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
  return `data:image/png;base64,${data.b64}`;
}

// ---------- Main UI ----------
export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I’m ready when you are. Type a message or use `/img your prompt` for images." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // ---------- UPDATED handleSend with guardrails ----------
  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);

    // image command: "/img ..." or "/image ..."
    const IMG_RE = /^\/(img|image)\s+/i;

    if (IMG_RE.test(text)) {
      const prompt = text.replace(IMG_RE, '').trim();
      // guard: empty prompt
      if (!prompt) {
        setMessages(m => [
          ...m,
          { role: 'assistant', content: 'Image error: please add a prompt after /img' }
        ]);
        setLoading(false);
        return;
      }

      // show what the user typed
      setMessages(m => [...m, { role: 'user', content: text }]);

      try {
        // always send a valid size
        const src = await generateImage(prompt, '1024x1024');
        setMessages(m => [
          ...m,
          { role: 'assistant', image: src, alt: prompt }
        ]);
      } catch (e) {
        setMessages(m => [
          ...m,
          { role: 'assistant', content: `Image error: ${e.message}` }
        ]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ---------- normal chat ----------
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
          <div style={styles.hint}><kbd>Enter</kbd> to send • Use <code>/img</code> for images</div>
        </div>

        <div ref={scrollRef} style={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} style={{ ...styles.msg, ...(m.role === 'user' ? styles.user : styles.assistant) }}>
              <strong style={{ opacity: .8 }}>
                {m.role === 'user' ? 'You' : 'Assistant'}:
              </strong>{' '}
              {m.image
                ? <img src={m.image} alt={m.alt || 'generated'} style={styles.image} />
                : <span>{m.content}</span>}
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
            placeholder="Type a message… or /img Snoopy skateboarding in Miami"
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
    background: '#0b0f14',
    color: '#e8eef6',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px'
  },
  header: {
    fontWeight: 800,
    letterSpacing: .4,
    marginBottom: 12
  },
  card: {
    width: '100%',
    maxWidth: 720,
    background: '#0f1621',
    border: '1px solid #1f2a3a',
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
  hint: { opacity: .6, fontSize: 12 },
  messages: {
    height: '55vh',
    overflowY: 'auto',
    padding: '8px 6px',
    background: '#0b111b',
    borderRadius: 8,
    border: '1px solid '#1b2535',
    marginBottom: 12
  },
  msg: { margin: '10px 0', lineHeight: 1.4 },
  user: { color: '#e8eef6' },
  assistant: { color: '#b7cdf7' },
  image: { maxWidth: '100%', borderRadius: 8, border: '1px solid #1b2535', marginTop: 6 },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  textarea: {
    flex: 1,
    resize: 'none',
    background: '#0b111b',
    color: '#e8eef6',
    border: '1px solid #1b2535',
    borderRadius: 8,
    padding: '10px 12px',
    outline: 'none'
  },
  button: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #1b2535',
    background: '#1a7f64',
    color: '#e8eef6',
    fontWeight: 700,
    cursor: 'pointer'
  },
  footerNote: { marginTop: 6, fontSize: 12, opacity: .6 }
};
