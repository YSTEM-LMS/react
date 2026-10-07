import React, { useState, useRef, useEffect } from 'react';
import './ChatWidget.scss';
import { environment } from '../../environments';
import { useCookies } from 'react-cookie';
import { CoachMascot, CoachExpression } from '../animations/CoachMascot/CoachMascot';

// A premium user icon SVG representing the AI Coach character in miniature
const UserIcon = () => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28" style={{ overflow: 'visible' }}>
    <defs>
      <linearGradient id="hairGradMini" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3d2c20" />
        <stop offset="100%" stopColor="#1a110a" />
      </linearGradient>
      <linearGradient id="skinGradMini" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f5cbb5" />
        <stop offset="100%" stopColor="#e29f80" />
      </linearGradient>
      <linearGradient id="suitGradMini" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8a9ba8" />
        <stop offset="100%" stopColor="#5c6a75" />
      </linearGradient>
    </defs>
    {/* Background Circle */}
    <circle cx="60" cy="60" r="58" fill="#1E293B" stroke="#ffffff" strokeWidth="4" />
    <g transform="scale(0.85) translate(10.5, 12)">
      {/* Neck */}
      <path d="M52 65 C52 75, 68 75, 68 65 L68 85 L52 85 Z" fill="url(#skinGradMini)" />
      {/* Ears */}
      <path d="M41 43 C37 43, 36 53, 41 52 Z" fill="#e29f80" />
      <path d="M79 43 C83 43, 84 53, 79 52 Z" fill="#e29f80" />
      {/* Head */}
      <path d="M41 40 C41 28, 79 28, 79 40 C79 56, 75 70, 60 74 C45 70, 41 56, 41 40 Z" fill="url(#skinGradMini)" />
      {/* Hair */}
      <path d="M41 42 C38 35, 40 20, 60 18 C80 20, 82 35, 79 42 C79 38, 77 34, 76 34 C76 32, 60 26, 44 34 C43 34, 41 38, 41 42 Z" fill="url(#hairGradMini)" />
      <path d="M40 38 C43 25, 50 18, 60 17 C70 18, 77 25, 80 38 C77 34, 73 30, 60 29 C47 30, 43 34, 40 38 Z" fill="url(#hairGradMini)" />
      <path d="M41 38 L41 48 L43 45 L43 38 Z" fill="#221915" />
      <path d="M79 38 L79 48 L77 45 L77 38 Z" fill="#221915" />
      {/* Eyebrows */}
      <path d="M44 38 Q49 35 54 37" stroke="#1a120e" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M66 37 Q71 35 76 38" stroke="#1a120e" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <ellipse cx="49" cy="45" rx="5" ry="3.2" fill="#ffffff" stroke="#2c1e15" strokeWidth="1" />
      <circle cx="49" cy="45" r="2.5" fill="#5c3a21" />
      <ellipse cx="71" cy="45" rx="5" ry="3.2" fill="#ffffff" stroke="#2c1e15" strokeWidth="1" />
      <circle cx="71" cy="45" r="2.5" fill="#5c3a21" />
      {/* Nose */}
      <path d="M60 45 L60 55 C60 57, 57 58, 60 58 C62 58, 62 56, 62 55" stroke="#bc7b5c" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Mouth */}
      <path d="M50 59 C50 59, 52 68, 60 68 C68 68, 70 59, 70 59 Z" fill="#4d120f" stroke="#2c1e15" strokeWidth="1.5" />
      <path d="M51 60 C53 62, 67 62, 69 60 L68 59 Z" fill="#ffffff" />
      {/* Vest */}
      <path d="M48 76 L72 76 L80 110 L40 110 Z" fill="#46515c" />
      {/* Shirt */}
      <path d="M50 74 L60 86 L70 74 L73 78 L60 94 L47 78 Z" fill="#ffffff" />
      {/* Suit */}
      <path d="M30 100 C30 84, 40 76, 48 76 L42 110 L30 110 Z" fill="url(#suitGradMini)" />
      <path d="M90 100 C90 84, 80 76, 72 76 L78 110 L90 110 Z" fill="url(#suitGradMini)" />
    </g>
  </svg>
);

const TOPICS = [
  { value: "general tutoring", label: "General Tutor & Coach" },
  { value: "math tutoring", label: "Math Tutoring 📐" },
  { value: "school homework help", label: "School Homework Help 📚" },
  { value: "goal-setting", label: "Goal-Setting 🎯" },
  { value: "growth mindset", label: "Growth Mindset 🌱" },
  { value: "time management", label: "Time Management ⏱️" },
  { value: "dealing with frustration", label: "Dealing with Frustration 😤" }
];



const ChatWidget = () => {
  // Closed by default — this previously opened on every page load, with its
  // full-screen chat-overlay-backdrop covering the whole page and blocking
  // every other click (badges, activities, streak, etc.) until manually
  // dismissed. A chat widget should wait to be opened, like any other.
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>('general tutoring');
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [coachExpression, setCoachExpression] = useState<CoachExpression>('welcome');
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const toggleWidget = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      setCoachExpression('welcome');
      if (!sessionId) {
        startSession("general tutoring");
      }
    }
  };

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!sessionId) {
      startSession("general tutoring");
    }
  }, []);

  const [cookies] = useCookies(['login']);

  const startSession = async (selectedTopic: string) => {
    setIsLoading(true);
    setTopic(selectedTopic);
    setCoachExpression('thinking');
    try {
      let resolvedUserId = "5f8f8c44b54764421b7156e0"; // Static fallback
      if (cookies.login) {
        try {
          const payload = JSON.parse(atob(cookies.login.split('.')[1]));
          const username = payload.username;
          if (username) {
            const userRes = await fetch(`${environment.urls.middlewareURL}/user/getUser?username=${encodeURIComponent(username)}`, {
              headers: { 'Authorization': `Bearer ${cookies.login}` }
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData && userData._id) {
                resolvedUserId = userData._id;
              }
            }
          }
        } catch (jwtErr) {
          console.error("Failed to decode token or resolve user ID:", jwtErr);
        }
      }

      const response = await fetch(`${environment.urls.middlewareURL}/chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resolvedUserId, topic: selectedTopic })
      });
      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session._id);

        let greeting = `Hi there! I'm your AI Tutor. 🧠 How are you feeling about your learning progress today?`;
        const t = selectedTopic.toLowerCase();
        if (t.includes('math')) {
          greeting = `Hi there! I'm your Socratic AI Tutor. 📐 Got a math problem you're working on? Let's solve it step-by-step together!`;
        } else if (t.includes('homework') || t.includes('school')) {
          greeting = `Hi there! I'm your AI Tutor. 📚 What school homework or assignment can I help you break down today?`;
        } else if (t.includes('goal')) {
          greeting = `Hi there! I'm your AI Tutor. 🎯 Let's work together to set some micro-goals and create an If-Then plan!`;
        } else if (t.includes('frustrat')) {
          greeting = `Hi! I'm your AI Tutor. 😤 If you are feeling frustrated or stuck, I'm here to support you. Let's work through it!`;
        } else if (t.includes('time')) {
          greeting = `Hi! I'm your AI Tutor. ⏱️ Let's talk about time management and how we can make your tasks feel much lighter!`;
        } else if (t.includes('mindset') || t.includes('growth')) {
          greeting = `Hi there! I'm your AI Tutor. 🌱 Ready to grow your brain and practice the Power of Yet?`;
        }

        setMessages([{ sender: 'bot', text: greeting }]);
        setCoachExpression('happy');
      } else {
        throw new Error("Failed to start session");
      }
    } catch (e) {
      console.error(e);
      setMessages([{ sender: 'bot', text: 'Error starting session. Please try again.' }]);
      setCoachExpression('welcome');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setCoachExpression('thinking');
    try {
      const response = await fetch(`${environment.urls.middlewareURL}/chat/session/${sessionId}/end`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [
          ...prev, 
          { sender: 'bot', text: `Session complete! 🎉\n\nSummary: ${data.session.summary}\n\nActions:\n${data.session.actions.join('\n')}` }
        ]);
        setSessionId(null);
        setCoachExpression('thumbsup');
      }
    } catch (e) {
      console.error(e);
      setCoachExpression('welcome');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTopic = e.target.value;
    if (selectedTopic === topic) return;
    setIsLoading(true);
    setCoachExpression('thinking');
    if (sessionId) {
      try {
        await fetch(`${environment.urls.middlewareURL}/chat/session/${sessionId}/end`, {
          method: 'POST'
        });
      } catch (err) {
        console.error("Error ending previous session on topic change:", err);
      }
    }
    setMessages([]);
    setSessionId(null);
    await startSession(selectedTopic);
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);
    setCoachExpression('thinking');

    try {
      const response = await fetch(`${environment.urls.middlewareURL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, message: userMsg })
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to fetch');
      }

      setMessages(prev => [...prev, { sender: 'bot', text: '' }]);
      setIsLoading(false);
      setCoachExpression('speaking');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.includes('data: [DONE]')) continue;
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.slice(6);
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices[0]?.delta?.content;
              
              if (content) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsgIndex = newMessages.length - 1;
                  newMessages[lastMsgIndex] = {
                    ...newMessages[lastMsgIndex],
                    text: newMessages[lastMsgIndex].text + content
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore incomplete JSON chunks
            }
          }
        }
      }

      setCoachExpression('happy');

    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'failed to fetch' }]);
      setIsLoading(false);
      setCoachExpression('welcome');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const getCoachBubbleText = () => {
    switch (coachExpression) {
      case 'welcome':
        return "Hello! I'm your AI Tutor. Ready to unlock your potential?";
      case 'thinking':
        return "Let me think about that for a second...";
      case 'speaking':
        return "Here's what I recommend for you...";
      case 'happy':
        return "Awesome! You are making great progress.";
      case 'thumbsup':
        return "Spot on! Keep up this amazing mindset.";
      default:
        return "Ready to practice some new mental skills?";
    }
  };

  const getProTipText = () => {
    const t = topic.toLowerCase();
    if (t.includes('math')) {
      return "Math is all about patterns and practice! Ask me to explain a step if it doesn't make sense yet.";
    }
    if (t.includes('homework') || t.includes('school')) {
      return "Breaking a big homework assignment into smaller tasks makes it much easier to start and finish.";
    }
    if (t.includes('goal')) {
      return "Micro-goals are tiny steps you can achieve today. Success builds momentum!";
    }
    return "Developing a growth mindset helps you embrace challenges and learn from failure. Take your time to reflect on your answers!";
  };

  return (
    <div className="chat-widget-container">
      {isOpen && (
        <div className="chat-overlay-backdrop" onClick={toggleWidget}>
          <div className="chat-widget-window" onClick={(e) => e.stopPropagation()}>
            
            {/* Left Column: AI Tutor Sidebar */}
            <div className="chat-coach-sidebar">
              <div className="sidebar-branding">
                <div className="mascot-badge">AI Tutor</div>
                <div className="status-indicator">
                  <span className="pulse-dot"></span>
                  Online
                </div>
              </div>

              {/* Tutor Avatar Display */}
              <div className="avatar-frame-container">
                <CoachMascot expression={coachExpression} />
                
                {/* Speech bubble for the mascot */}
                <div className="coach-bubble">
                  <div className="bubble-arrow"></div>
                  <p>{getCoachBubbleText()}</p>
                </div>
              </div>

              {/* Tips & Guidance Info card */}
              <div className="coach-tips-card">
                <h5>Pro Tip 💡</h5>
                <p>{getProTipText()}</p>
              </div>
            </div>

            {/* Right Column: Chat Workspace */}
            <div className="chat-main-area">
              <div className="chat-header">
                <div className="header-title-section" style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                  <h4 style={{ margin: 0, whiteSpace: 'nowrap' }}>AI Tutor & Coach</h4>
                  <div className="topic-select-container" style={{ position: 'relative' }}>
                    <select 
                      value={topic} 
                      onChange={handleTopicChange}
                      disabled={isLoading}
                      className="topic-dropdown-select"
                      style={{
                        background: '#BFD99E',
                        color: '#1F1F1F',
                        padding: '6px 36px 6px 14px',
                        borderRadius: '16px',
                        fontSize: '13px',
                        fontWeight: '700',
                        border: '2px solid #1F1F1F',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        appearance: 'none',
                        outline: 'none',
                        boxShadow: '2px 2px 0px #1F1F1F',
                        transition: 'all 0.2s'
                      }}
                    >
                      {TOPICS.map((t) => (
                        <option key={t.value} value={t.value} style={{ background: '#F9FAF7', color: '#1F1F1F' }}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      fontSize: '10px',
                      color: '#1F1F1F',
                      fontWeight: 'bold'
                    }}>
                      ▼
                    </div>
                  </div>
                </div>
                <div className="chat-header-actions">
                  {sessionId && (
                    <button onClick={handleEndSession} className="end-btn" title="End Session">
                      End Session 🏁
                    </button>
                  )}
                  <button onClick={toggleWidget} className="close-btn" title="Close">&times;</button>
                </div>
              </div>

              <div className="chat-messages" ref={chatMessagesRef}>
                {!sessionId && messages.length === 0 ? (
                  <div className="chat-loading-session" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <div className="typing-loader">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <p style={{ marginTop: '14px', color: '#64748B', fontSize: '15px', fontWeight: '500' }}>Starting your tutoring session...</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`chat-message ${msg.sender}`}>
                        <div className="message-sender-label">
                          {msg.sender === 'user' ? 'You' : 'Tutor'}
                        </div>
                        <div className="message-text">
                          {msg.text.split('\n').map((line, i) => (
                            <React.Fragment key={i}>
                              {line}
                              <br />
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="chat-message bot loading">
                        <div className="message-sender-label">Tutor</div>
                        <div className="typing-loader">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {sessionId && (
                <div className="chat-input-area">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Reflect and reply here..."
                    disabled={isLoading}
                  />
                  <button onClick={handleSend} disabled={isLoading || !input.trim()}>
                    Send
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
      
      {!isOpen && (
        <button className="chat-text-button" onClick={toggleWidget} aria-label="Talk to AI Tutor">
          <span className="button-pulse-beacon"></span>
          <span className="button-sparkle">✨</span>
          <span className="button-label-text">Talk to AI Tutor</span>
          <span className="button-brain-icon">🧠</span>
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
