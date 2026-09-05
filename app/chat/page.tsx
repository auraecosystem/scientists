'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({ api: '/api/chat' });
  const busy = status === 'submitted' || status === 'streaming';
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const text = input.trim(); if (!text || busy) return; setInput(''); await sendMessage({ text }); }
  return <main style={{maxWidth:760,margin:'0 auto',padding:'2rem 1rem',fontFamily:'system-ui'}}><h1>Scientists AI</h1><p>Multi-turn scientific conversation.</p><section aria-live="polite" style={{minHeight:360}}>{messages.map((message) => <article key={message.id} style={{margin:'1rem 0',padding:12,border:'1px solid #ccc',borderRadius:8}}><strong>{message.role === 'user' ? 'You' : 'AI'}</strong><div style={{whiteSpace:'pre-wrap'}}>{message.parts?.map((part,index) => part.type === 'text' ? <span key={`${message.id}-${index}`}>{part.text}</span> : null)}</div></article>)}</section><form onSubmit={submit} style={{display:'flex',gap:8}}><input value={input} onChange={(e)=>setInput(e.target.value)} disabled={busy} aria-label="Message" placeholder="Ask a scientific question" style={{flex:1,padding:10}}/><button type="submit" disabled={busy || !input.trim()}>{busy ? 'Thinking…' : 'Send'}</button></form></main>;
}
