'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    api: '/api/chat',
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    await sendMessage({ text });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Scientists AI</h1>
        <p className="text-sm text-gray-500">Multi-turn research conversation</p>
      </header>

      <section className="flex-1 space-y-4 overflow-y-auto pb-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="rounded-lg border p-4 text-sm text-gray-500">
            Ask a scientific question to start a conversation.
          </div>
        )}

        {messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[85%] rounded-lg p-3 ${
              message.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-gray-100 text-gray-900'
            }`}
          >
            <strong className="mr-2">{message.role === 'user' ? 'You' : 'AI'}</strong>
            <div className="mt-1 whitespace-pre-wrap">
              {message.parts?.map((part, index) =>
                part.type === 'text' ? <span key={`${message.id}-${index}`}>{part.text}</span> : null,
              )}
            </div>
          </article>
        ))}
      </section>

      <form onSubmit={handleSubmit} className="sticky bottom-0 flex gap-2 border-t bg-white py-4">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a question..."
          className="flex-1 rounded-md border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {isLoading ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </main>
  );
}
