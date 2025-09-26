"use client";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey! I’m ready when you are. Ask me anything." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || "VenegasAI";
  const model = process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o-mini";

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next })
      });
      if (!res.ok) throw new Error("Bad response");
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "⚠️ Couldn’t reach the server. Check your API key in .env.local." }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
  }

  return (
    <div className="container">
      <div className="header">
        <div className="brand">{appName}</div>
        <div className="footnote">
          <span className="kbd">⌘/Ctrl</span> + <span className="kbd">Enter</span> to send
        </div>
      </div>

      <div className="card">
        <h1>Chat</h1>
        <div className="subtitle">Fast, minimal, private. No data is stored.</div>

        <div ref={listRef} className="messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <strong>{m.role === "user" ? "You" : "Assistant"}:</strong> {m.content}
            </div>
          ))}
        </div>

        <div className="row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message..."
          />
          <button onClick={send} disabled={loading}>{loading ? "Sending…" : "Send"}</button>
        </div>
        <div className="footnote">Model: {model}</div>
      </div>
    </div>
  );
}
