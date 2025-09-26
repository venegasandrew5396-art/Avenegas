'use client';
import { useEffect, useRef, useState } from 'react';

const MODEL_NAME = 'gpt-5';

// --- API helpers ---
async function generateImage(prompt, size = 'auto') {
  const res = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, size }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  const b64 = data.b64;
  if (!b64) throw new Error('No image data returned');
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
}

async function sendChat(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data.message;
}

// --- Prompt helpers for speed on Hobby ---
function simplifyPrompt(p) {
  if (!p) return '';
  let s = p.trim().replace(/\s+/g, ' ');
  // kill heavy style chains
  s = s.replace(/,\s*(ultra|hyper|octane|8k|unreal|cinematic|photoreal|ray\s*tracing|hdr)\b.*$/i, '');
  if (s.length > 180) s = s.slice(0, 180);
  return s;
}

// Instant local SVG fallback for simple asks
function svgFallbackURL(prompt) {
  if (!prompt) return null;
  const p = prompt.toLowerCase();
  const hex = (w) => ({
    red:'#ff0000', blue:'#0057ff', green:'#00b050', yellow:'#ffd400', orange:'#ff7a00',
    purple:'#7a3cff', pink:'#ff4fa3', black:'#000000', white:'#ffffff', gray:'#888888',
    gold:'#d4b866', teal:'#1f7d5e', navy:'#0f172a', maroon:'#7a0026'
  })[w] || null;
  const colorWord = (p.match(/\b(red|blue|green|yellow|orange|purple|pink|black|white|gray|gold|teal|navy|maroon)\b/) || [])[0] || 'red';
  const color = hex(colorWord) || '#ff0000';

  if (/\bsquare\b/.test(p)) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'><rect width='100%' height='100%' fill='${color}'/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  if (/\bcircle\b/.test(p)) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'><circle cx='512' cy='512' r='480' fill='${color}'/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  if (/\brectangle\b/.test(p)) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1536' height='1024'><rect width='100%' height='100%' fill='${color}'/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  if (/\bgradient\b/.test(p)) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${color}'/><stop offset='100%' stop-color='#07140f'/>
      </linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  return null;
}

// Try fast path first (auto + short prompt), then one more attempt, then SVG fallback if simple
async function generateImageWithRetry(prompt) {
  const p1 = simplifyPrompt(prompt) || prompt;
  try {
    return await generateImage(p1, 'auto'); // fastest on Hobby
  } catch (e1) {
    const msg1 = String(e1?.message || '').toLowerCase();
    const timeout1 = msg1.includes('504') || msg1.includes('timed out');
    if (!timeout1) throw e1;

    // second try: even tighter prompt (first short sentence)
    const p2 = (p1.split(/[.!?]/)[0] || p1).slice(0, 140) || 'simple flat vector';
    try {
      return await generateImage(p2, 'auto');
    } catch (e2) {
      const msg2 = String(e2?.message || '').toLowerCase();
      const timeout2 = msg2.includes('504') || msg2.includes('timed out');
      const svg = svgFallbackURL(prompt);
      if (svg && timeout2) return svg;
      throw e2;
    }
  }
}

// --- UI ---
export default function Page() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to VenegasAI — to start, just type a message below.' }
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

    const IMG_RE = /^(?:\/(?:img|image)|create(?:\s+an)?\s+image(?:\s+of)?)\s+/i;

    if (IMG_RE.test(text)) {
      const prompt = text.replace(IMG_RE, '').trim();
      if (!prompt) {
        setMessages(m => [...m, { role: 'assistant', content: 'Image error: please add a prompt after your command' }]);
        setLoading(false);
        return;
      }
      setMessages(m => [...m, { role: 'user', content: text }]);
      try {
        const src = await generateImageWithRetry(prompt);
        setMessages(m => [...m, { role: 'assistant', image: src, alt: prompt }]);
      } catch (e) {
        setMessages(m => [
          ...m,
          { role: 'assistant',
            content: `Image error: ${e.message}. Tip: shorten details or try “create image … flat vector, no photoreal”.`
          }
        ]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // normal chat
    const userMsg = { role: 'user', content: text };
    setMessages(m => [...m, userMsg]);

    try {
      const history = messages
        .filter(m => typeof m.content === 'string' && !m.image)
        .map(m => ({ role: m.role, content: m.content }));
      const reply = await sendChat([...history, userMsg]);
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
        <div style={styles.titleRow}><div style={styles.title}>Chat</div></div>

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
              ) : (<span>{m.content}</span>)}
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

// --- Styles ---
const styles = {
  page: {
    minHeight: '100vh',
    background: '#07140f',
    color: '#ffffff',
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24
  },
  header: { fontWeight: 800, letterSpacing: .4, marginBottom: 12, color: '#d4b866' },
  card: {
    width: '100%', maxWidth: 720, background: '#0e1f17',
    border: '1px solid #143426', borderRadius: 12, padding: 16, boxShadow: '0 8px 20px rgba(0,0,0,.35)'
  },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 700 },
  messages: {
    height: '55vh', overflowY: 'auto', padding: '8px 6px',
    background: '#10241b', borderRadius: 8, border: '1px solid #143426', marginBottom: 12
  },
  msg: { margin: '10px 0', lineHeight: 1.5 },
  user: { color: '#ffffff' },
  assistant: { color: '#b8d1c1' },
  image: { maxWidth: '100%', borderRadius: 8, border: '1px solid #143426', marginTop: 6 },
  inputRow: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  textarea: {
    flex: 1, resize: 'none', background: '#143426', color: '#ffffff',
    border: '1px solid #1f3d2d', borderRadius: 8, padding: '12px 14px', outline: 'none', fontSize: 15, lineHeight: 1.4
  },
  button: {
    padding: '12px 18px', borderRadius: 8, border: '1px solid #b79b4f',
    background: '#d4b866', color: '#092015', fontWeight: 700, cursor: 'pointer'
  },
  footerNote: { marginTop: 6, fontSize: 12, opacity: .7 }
};
