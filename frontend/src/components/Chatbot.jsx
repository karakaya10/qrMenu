import { useState, useEffect, useRef } from 'react';
import './Chatbot.css';

const SESSION_ID = 'session_' + Math.random().toString(36).slice(2);

export default function Chatbot({ onClose, onAddToCart, products }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Merhaba! Size nasıl yardımcı olabilirim? Ne yemek/içmek istersiniz?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, session_id: SESSION_ID })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar dener misiniz?'
      }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addProductToCart = (productName) => {
    const product = products.find(p => p.name === productName);
    if (product) {
      onAddToCart(product);
    }
  };

  return (
    <div className="chat-overlay">
      <div className="chat-panel">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <h3>AI Asistan</h3>
              <span className="chat-status">Çevrimiçi</span>
            </div>
          </div>
          <button className="chat-close" onClick={onClose}>&times;</button>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg ${msg.role}`}>
              <div className="msg-bubble">
                {msg.content}
                {msg.role === 'assistant' && (
                  <div className="msg-actions">
                    {products.map(p => (
                      msg.content.toLowerCase().includes(p.name.toLowerCase()) && (
                        <button
                          key={p.id}
                          className="msg-add-btn"
                          onClick={() => addProductToCart(p.name)}
                        >
                          + {p.name} ({p.price} TL)
                        </button>
                      )
                    ))}
                    {/* Fallback: if message suggests a product, parse it */}
                    {!products.some(p => msg.content.toLowerCase().includes(p.name.toLowerCase())) &&
                     msg.content.includes('TL') && (
                      <div className="msg-hint">
                        <button className="msg-add-btn" onClick={() => {
                          const match = msg.content.match(/(.+?)\s*\(?(\d+)\s*TL/);
                          if (match) addProductToCart(match[1].trim());
                        }}>
                          + Sepete Ekle
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg assistant">
              <div className="msg-bubble loading">
                <span className="dot-pulse"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="suggestions">
            {['Ne önerirsin?', 'Tatlı istiyorum', 'Kahve var mı?'].map(s => (
              <button
                key={s}
                className="suggestion-btn"
                onClick={() => {
                  setInput(s);
                  setTimeout(() => sendMessage(), 100);
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Bir şey yaz..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
