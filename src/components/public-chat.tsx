'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PublicChatProps {
  /** API endpoint for public chat */
  endpoint?: string;
  /** Title shown in the chat header */
  title?: string;
  /** Welcome message */
  welcomeMessage?: string;
  /** Welcome subtitle */
  welcomeSubtitle?: string;
}

/**
 * Public-facing chat widget (no auth required).
 * Connects to /api/agent/public by default.
 */
export function PublicChat({
  endpoint = '/api/agent/public',
  title = 'Chat with us',
  welcomeMessage = 'Welcome! \ud83d\udc4b',
  welcomeSubtitle = 'Ask us anything.',
}: PublicChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: endpoint }),
    onError: (error) => {
      console.error('Public Chat Error:', error);
    },
  });
  const isLoading = status === 'submitted' || status === 'streaming';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <>
      {/* Toggle */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-8.5S17.322 4 12 4s-9.75 3.97-9.75 8.5c0 2.012.738 3.87 1.985 5.37-.247.95-.62 1.82-1.143 2.556a.736.736 0 00.712 1.218z" clipRule="evenodd" />
          </svg>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-emerald-500/5 backdrop-blur-md"
            role="dialog"
            aria-label={title}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold">
                  🤖
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                  <p className="text-xs text-emerald-200">
                    {isLoading ? 'Typing...' : 'Ask us anything'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                  <div className="mb-3 text-3xl">👋</div>
                  <p className="text-sm font-medium text-slate-300">{welcomeMessage}</p>
                  <p className="mt-1 max-w-[240px] text-xs text-slate-500">
                    {welcomeSubtitle}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                          m.role === 'user'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {m.parts.map((part, i) => {
                          if (part.type === 'text') {
                            return m.role === 'assistant' ? (
                              <div
                                key={i}
                                className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2 prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline"
                              >
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {part.text}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                            );
                          }
                          if (part.type === 'tool-invocation') {
                            const toolPart = part as Record<string, unknown>;
                            return (
                              <div key={i} className="my-1 text-xs text-emerald-300/60 italic">
                                {toolPart.state === 'result' ? '\u2713 Found relevant info' : 'Searching...'}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1 rounded-2xl bg-slate-800 px-4 py-3">
                        <span className="block h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.3s]" />
                        <span className="block h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.15s]" />
                        <span className="block h-2 w-2 animate-bounce rounded-full bg-slate-500" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!input.trim()) return;
                  sendMessage({ text: input });
                  setInput('');
                }}
                className="relative"
              >
                <label htmlFor="public-chat-input" className="sr-only">
                  Send a message
                </label>
                <input
                  id="public-chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask us anything..."
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 pr-12 text-sm text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white transition-opacity hover:opacity-90 disabled:bg-slate-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500"
                  aria-label="Send message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M1.94631 9.31555C1.42377 9.14137 1.41965 8.86034 1.95694 8.6812L21.0432 2.31901C21.5717 2.14285 21.8748 2.43866 21.7267 2.95694L16.2735 22.0432C16.1225 22.5717 15.8179 22.5901 15.5946 22.0877L12.0001 14.0001L18.0001 6.00005L10.0001 12.0001L1.94631 9.31555Z" />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
