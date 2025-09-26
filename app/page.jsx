'use client';

import { useState, useRef, useEffect } from 'react';

async function sendChat(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `HTTP ${res.status}`);
  }
  const data = await res.json();             // { ok, message: { role, content } }
  return data.message;
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! I’m ready when you are. Ask me anything." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    try {
      const reply = await sendChat([...messages, userMsg]); // send full context
      setMessages(prev => [...prev, { role: 'assistant', content: reply.content }]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Server error: ${e.message}` }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
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
          <div style={styles.hint}><kbd>⌘/Ctrl</kbd> + <kbd>Enter</kbd> to send</div>
        </div>

        <div ref={scrollRef} style={styles.messages}>
          {messages.map((m, i) => (
            <div key={i} style={{ ...styles.msg, ...(m.role === 'user' ? styles.user : styles.assistant) }}>
              <strong style={{ opacity: .8 }}>
                {m.role === 'user' ? 'You' : 'Assistant'}:
              </strong>{' '}
              <span>{m.content}</span>
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
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message…"
            style={styles.textarea}
            rows={1}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()} style={styles.button}>
            Send
          </button>
        </div>

        const MODEL_NAME = "gpt-5"; // just a label for the UI
...
<div style={styles.footerNote}>Model: {MODEL_NAME}</div>
      </div>
    </div>
  );
}

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
    border: '1px solid #1b2535',
    marginBottom: 12
  },
  msg: {
    margin: '10px 0',
    lineHeight: 1.4
  },
  user: { color: '#e8eef6' },
  assistant: { color: '#b7cdf7' },
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end'
  },
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
    cursor: 'pointer',
    opacity: 1
  },
  footerNote: {
    marginTop: 6,
    fontSize: 12,
    opacity: .6
  }
};
