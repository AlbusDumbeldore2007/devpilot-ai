import { Fragment, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Bot,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import ErrorAlert from '../components/ErrorAlert.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { aiApi } from '../services/api.js';
import { useDocumentTitle } from '../hooks/useDebounce.js';
import { useToast } from '../hooks/useToast.jsx';

const SUGGESTIONS = [
  'Explain JavaScript closures with a practical example.',
  'How should I structure an Express + MongoDB REST API?',
  'Debug this: "TypeError: Cannot read properties of undefined (reading map)".',
  'Break down building JWT authentication into concrete tasks.',
];

/** Safe, dependency-free renderer for fenced code blocks + inline code. */
function MessageContent({ content }) {
  const blocks = content.split('```');

  return (
    <div className="message__text">
      {blocks.map((block, index) => {
        if (index % 2 === 1) {
          const lines = block.replace(/^\n/, '').split('\n');
          let language = 'code';
          if (lines[0] && /^[a-zA-Z0-9+#.-]+$/.test(lines[0].trim())) {
            language = lines[0].trim();
            lines.shift();
          }
          return (
            <div className="code-block" key={`code-${index}`}>
              <div className="code-block__header">
                <span>{language}</span>
              </div>
              <pre><code>{lines.join('\n').replace(/\n$/, '')}</code></pre>
            </div>
          );
        }

        const inline = block.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        return (
          <Fragment key={`text-${index}`}>
            {inline.map((part, partIndex) => {
              if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
                return <code className="inline-code" key={partIndex}>{part.slice(1, -1)}</code>;
              }
              if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
              }
              return <Fragment key={partIndex}>{part}</Fragment>;
            })}
          </Fragment>
        );
      })}
    </div>
  );
}

function Message({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`message ${isUser ? 'message--user' : 'message--assistant'}`}>
      <span className={`message__avatar ${isUser ? 'message__avatar--user' : 'message__avatar--ai'}`}>
        {isUser ? <User size={15} /> : <Sparkles size={15} />}
      </span>
      <div className="message__body">
        <div className="message__meta">
          <strong>{isUser ? 'You' : 'DevPilot AI'}</strong>
        </div>
        <div className={`message__bubble ${isUser ? 'message__bubble--user' : ''}`}>
          <MessageContent content={message.content} />
        </div>
      </div>
    </div>
  );
}

export default function Assistant() {
  const [messages, setMessages] = useState(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('devpilot-chat') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const lastConversation = useRef(null);
  const { toast } = useToast();
  useDocumentTitle('AI Assistant');

  /* Chat history survives route changes for the duration of the tab session. */
  useEffect(() => {
    sessionStorage.setItem('devpilot-chat', JSON.stringify(messages.slice(-40)));
  }, [messages]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loading, error]);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(168, element.scrollHeight)}px`;
  }, [input]);

  const requestReply = async (conversation) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.chat(conversation.slice(-20).map(({ role, content }) => ({ role, content })));
      setMessages((current) => [...current, { role: 'assistant', content: response.data.content }]);
      if (response.meta?.model) setModel(response.meta.model);
    } catch (requestError) {
      setError({ message: requestError.message, details: requestError.details, code: requestError.code });
      toast.error('Assistant unavailable', requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (rawText = input) => {
    const text = rawText.trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setInput('');
    lastConversation.current = conversation;
    await requestReply(conversation);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const retry = () => {
    if (lastConversation.current) requestReply(lastConversation.current);
  };

  const clearConversation = () => {
    setMessages([]);
    setError(null);
    setModel('');
    lastConversation.current = null;
    sessionStorage.removeItem('devpilot-chat');
    setClearOpen(false);
    toast.info('Conversation cleared', 'Your chat history for this session was removed.');
    inputRef.current?.focus();
  };

  return (
    <div className="page assistant-page">
      <header className="page-header">
        <div>
          <p className="eyebrow"><Bot size={13} /> AI Copilot</p>
          <h1>AI Assistant</h1>
          <p className="page-subtitle">Explain concepts, debug errors, review architecture and break down complex work.</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--ghost" onClick={() => setClearOpen(true)} disabled={messages.length === 0}>
            <RotateCcw size={15} /> Clear conversation
          </button>
        </div>
      </header>

      <section className="chat card">
        <header className="chat__header">
          <div className="chat__identity">
            <span className="chat__avatar"><Sparkles size={18} /></span>
            <div>
              <p>DevPilot Assistant</p>
              <span>
                <i className="status-dot status-dot--success" />
                {model ? `Model · ${model}` : 'Server-side LLM integration'}
              </span>
            </div>
          </div>
          <div className="chat__header-meta">
            <span>{messages.length} messages</span>
          </div>
        </header>

        <div className="chat__messages" ref={messagesRef}>
          {messages.length === 0 && !loading ? (
            <div className="chat-empty">
              <span className="chat-empty__orb"><MessageSquare size={24} /></span>
              <h2>What are you working on?</h2>
              <p>
                Ask for a concept explanation, paste an error, request a code review or turn a complex feature into
                concrete steps. The API key stays on the server.
              </p>
              <div className="chat-suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} onClick={() => sendMessage(suggestion)}>
                    <Sparkles size={13} />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((message, index) => (
                <Message key={`${message.role}-${index}`} message={message} />
              ))}
              {loading && (
                <div className="message message--assistant">
                  <span className="message__avatar message__avatar--ai"><Sparkles size={15} /></span>
                  <div className="message__body">
                    <div className="message__meta"><strong>DevPilot AI</strong></div>
                    <div className="message__bubble typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="chat__composer">
          {error && (
            <ErrorAlert
              title={error.code === 'AI_NOT_CONFIGURED' ? 'AI is not configured' : 'Message failed'}
              message={error.message}
              details={error.details}
              onRetry={retry}
            />
          )}
          <form onSubmit={handleSubmit} className="composer">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, 6000))}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about code, architecture or debugging…"
              aria-label="Message the AI assistant"
              disabled={loading}
            />
            <button type="submit" className="composer__send" disabled={loading || !input.trim()} aria-label="Send message">
              {loading ? <span className="spinner" /> : <ArrowUp size={18} />}
            </button>
          </form>
          <div className="composer__footer">
            <span>Enter to send · Shift + Enter for a new line</span>
            <span className="composer__privacy"><Trash2 size={11} /> History stays in this tab</span>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={clearConversation}
        title="Clear conversation?"
        message="This removes every message from the current browser tab session. You cannot undo this action."
        confirmLabel="Clear chat"
        tone="primary"
      />
    </div>
  );
}
