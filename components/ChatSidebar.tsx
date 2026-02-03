import React, { useRef, useEffect, useState } from 'react';
import { Bot, MessageSquare, Send, Sparkles, Lightbulb, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { askAssistant, summarizeConversation } from '../services/gemini';
import { SUGGESTED_QUESTIONS } from '../types';

export const ChatSidebar: React.FC = () => {
  const {
    theme,
    chatMessages,
    chatInput,
    setChatInput,
    isAssistantThinking,
    setIsAssistantThinking,
    addChatMessage,
    file,
    conversationSummary,
    setConversationSummary,
    addAuditLog,
  } = useAppStore();

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAssistantThinking]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      setShowSuggestions(false);
    }
  }, [chatMessages.length]);

  const handleSendChat = async (message?: string) => {
    const userMsg = message || chatInput.trim();
    if (!userMsg || !file.fileBase64 || isAssistantThinking) return;

    setChatInput('');
    addChatMessage({ role: 'user', text: userMsg });
    setIsAssistantThinking(true);

    addAuditLog({
      action: 'chat',
      details: { userMessage: userMsg },
    });

    try {
      const response = await askAssistant(userMsg, file.fileBase64, file.fileType);
      addChatMessage({ role: 'assistant', text: response });
    } catch (error) {
      console.error(error);
      addChatMessage({
        role: 'assistant',
        text: 'Error communicating with AI assistant. Please try again.',
      });
    } finally {
      setIsAssistantThinking(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (chatMessages.length === 0 || isGeneratingSummary) return;

    setIsGeneratingSummary(true);
    try {
      const summary = await summarizeConversation(
        chatMessages.map((m) => ({ role: m.role, text: m.text }))
      );
      setConversationSummary({
        text: summary,
        generatedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    handleSendChat(question);
  };

  return (
    <div
      style={{
        background: isDark ? '#1f2937' : '#fff',
        borderRadius: '16px',
        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        height: '620px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          background: isDark ? '#111827' : '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '16px 16px 0 0',
        }}
      >
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: isDark ? '#f9fafb' : '#111827',
          }}
        >
          <Bot size={20} color="#9333ea" /> Bid AI Assistant
        </h3>
        {chatMessages.length > 2 && (
          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              background: isDark ? '#374151' : '#f3f4f6',
              color: isDark ? '#9ca3af' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: isGeneratingSummary ? 'not-allowed' : 'pointer',
              opacity: isGeneratingSummary ? 0.5 : 1,
            }}
          >
            <FileText size={12} />
            {isGeneratingSummary ? 'Summarizing...' : 'Summarize'}
          </button>
        )}
      </div>

      {/* Conversation Summary */}
      {conversationSummary && (
        <div
          style={{
            padding: '12px 16px',
            background: isDark ? '#1e3a5f' : '#eff6ff',
            borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            fontSize: '0.8rem',
            color: isDark ? '#93c5fd' : '#1e40af',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={12} /> Key Takeaways
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{conversationSummary.text}</div>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {chatMessages.length === 0 && !showSuggestions && (
          <div style={{ textAlign: 'center', color: isDark ? '#6b7280' : '#9ca3af', padding: '40px 20px' }}>
            <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
            <p style={{ fontSize: '0.9rem' }}>
              Ask me about liquidated damages, bonding requirements, or any technical details in the document.
            </p>
          </div>
        )}

        {showSuggestions && chatMessages.length === 0 && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                color: isDark ? '#9ca3af' : '#6b7280',
                fontSize: '0.85rem',
              }}
            >
              <Lightbulb size={14} />
              <span>Suggested questions:</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SUGGESTED_QUESTIONS.slice(0, 5).map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(q)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    background: isDark ? '#374151' : '#f3f4f6',
                    border: 'none',
                    borderRadius: '10px',
                    color: isDark ? '#d1d5db' : '#374151',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              padding: '12px 16px',
              borderRadius: '14px',
              background: msg.role === 'user' ? '#2563eb' : isDark ? '#374151' : '#f3f4f6',
              color: msg.role === 'user' ? '#fff' : isDark ? '#f9fafb' : '#111827',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {msg.text}
          </div>
        ))}

        {isAssistantThinking && (
          <div
            style={{
              alignSelf: 'flex-start',
              background: isDark ? '#374151' : '#f3f4f6',
              padding: '12px 16px',
              borderRadius: '14px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: isDark ? '#9ca3af' : '#6b7280' }}
              ></span>
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: isDark ? '#9ca3af' : '#6b7280', animationDelay: '-0.15s' }}
              ></span>
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: isDark ? '#9ca3af' : '#6b7280', animationDelay: '-0.3s' }}
              ></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '20px',
          borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          display: 'flex',
          gap: '10px',
        }}
      >
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
          placeholder="Ask a question..."
          style={{
            flex: 1,
            padding: '10px 14px',
            border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
            borderRadius: '10px',
            fontSize: '0.9rem',
            background: isDark ? '#111827' : '#fff',
            color: isDark ? '#f9fafb' : '#111827',
          }}
          disabled={isAssistantThinking}
        />
        <button
          onClick={() => handleSendChat()}
          disabled={!chatInput.trim() || isAssistantThinking}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
            opacity: !chatInput.trim() || isAssistantThinking ? 0.5 : 1,
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
