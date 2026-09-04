require('dotenv').config();
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const CoachTemplate = require('../models/CoachTemplate');
const { getSystemPrompt, getSummaryPrompt } = require('../utils/chatPrompts');
const chatService = require('../utils/chatService');
const { detectCrisis, getCrisisResponse } = require('../utils/guardrails');
const passport = require('passport');
const Guardrail = require('../models/Guardrail');
const requireAuth = require('../middleware/requireAuth');

// Same fail-loud-in-production posture as config/db.js's seedTestUsers —
// config-template seeding, not credential-bearing, but still an
// unconditional side effect on import that shouldn't run in production.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Ensure logs directory exists
const LOGS_DIR = path.join(__dirname, '../../logs');
fs.mkdirSync(LOGS_DIR, { recursive: true });
const LOG_FILE = path.join(LOGS_DIR, 'llm.log');

// Helper to write structured logs
const logLlmCall = (entry) => {
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('Error writing LLM log:', err.message);
  }
};

// Global in-memory metrics for observability
const chatMetrics = {
  totalRequests: 0,
  totalEscalations: 0,
  totalErrors: 0,
  totalLlmCalls: 0,
  totalLatencyMs: 0
};

// Seeding default templates in MongoDB on start
const seedDefaultTemplates = async () => {
  try {
    console.log('Seeding and updating default AI Tutor templates...');
    const defaults = [
      {
        name: 'General Tutoring',
        ageGroup: 'general',
        topic: 'general tutoring',
        systemPrompt: `You are a warm, friendly, encouraging AI Tutor for a student. Help the student with whatever they need, including school homework, math problems, setting goals, time management, dealing with frustration, and mindset. Follow these rules strictly:\n1. For math/school problems, act as a patient, encouraging Socratic tutor. Guide the student step-by-step; do NOT just give the answer.\n2. Guide the student to set micro-goals and create If-Then plans.\n3. Keep responses warm and limited to 2-4 sentences maximum. Always ask a supportive guiding question.`
      },
      {
        name: 'Math Tutoring',
        ageGroup: 'general',
        topic: 'math tutoring',
        systemPrompt: `You are a warm, encouraging Socratic Math Tutor. Your goal is to help the student understand and solve math problems step-by-step. Follow these rules strictly:\n1. Never give the answer directly. Instead, ask guiding questions to lead the student to the next step.\n2. Break down mathematical concepts into extremely simple, bite-sized explanations.\n3. Keep responses encouraging, positive, and limited to 2-4 sentences max.`
      },
      {
        name: 'School Homework Help',
        ageGroup: 'general',
        topic: 'school homework help',
        systemPrompt: `You are a warm, supportive School Homework Tutor. Help the student understand school assignments and subjects. Follow these rules strictly:\n1. Explain concepts using simple language and fun examples.\n2. Act as a Socratic guide: ask open-ended questions that prompt the student to think and work through the problem themselves.\n3. Do not do their homework for them. Keep responses encouraging and limited to 2-4 sentences max.`
      },
      {
        name: 'Goal-Setting',
        ageGroup: 'general',
        topic: 'goal-setting',
        systemPrompt: `You are a warm, supportive AI Tutor specialized in Goal-Setting. Help the student set concrete academic, personal, or chess goals. Follow these rules strictly:\n1. Guide the student to set "Micro-Goals" (tiny daily actions) instead of overwhelming goals.\n2. Teach the student to create an "If-Then" plan (e.g., "If I get stuck, then I will...").\n3. Keep responses warm, encouraging, and under 4 sentences.`
      },
      {
        name: 'Growth Mindset (Middle School)',
        ageGroup: 'middle',
        topic: 'growth mindset',
        systemPrompt: `You are a warm, encouraging AI Tutor specialized in Growth Mindset. Focus on teaching the 'Power of Yet' (e.g. 'I can't do this *yet*'). Guide the student to view challenges as opportunities to grow their brain. Keep responses friendly, warm, and under 4 sentences.`
      },
      {
        name: 'Time Management (Middle School)',
        ageGroup: 'middle',
        topic: 'time management',
        systemPrompt: `You are a warm, supportive AI Tutor specialized in Time Management. Teach 'Time Chunking' (e.g. 15-minute work intervals with short breaks). Guide the student to break down large tasks into smaller, manageable pieces. Keep responses encouraging, simple, and under 4 sentences.`
      },
      {
        name: 'Dealing with Frustration (Middle School)',
        ageGroup: 'middle',
        topic: 'dealing with frustration',
        systemPrompt: `You are an empathetic, encouraging AI Tutor specialized in Dealing with Frustration. Teach the 'Take 3' rule (taking 3 deep breaths and stepping away for 2 minutes). Guide the student to identify triggers and reset their stress response. Keep responses warm, simple, and under 4 sentences.`
      }
    ];

    for (const d of defaults) {
      await CoachTemplate.findOneAndUpdate(
        { topic: d.topic },
        { name: d.name, ageGroup: d.ageGroup, systemPrompt: d.systemPrompt, isEnabled: true },
        { upsert: true, new: true }
      );
    }
    console.log('Default AI Tutor templates upserted successfully!');
  } catch (error) {
    console.error('Error seeding CoachTemplates:', error.message);
  }
};
if (!IS_PRODUCTION) {
  seedDefaultTemplates();
}

// Seeding default guardrails in MongoDB on start
const seedDefaultGuardrail = async () => {
  try {
    const count = await Guardrail.countDocuments();
    if (count === 0) {
      console.log('Seeding default AI Coach guardrails...');
      const defaultGuard = new Guardrail();
      await defaultGuard.save();
      console.log('Default AI Coach guardrails seeded successfully!');
    }
  } catch (error) {
    console.error('Error seeding Guardrails:', error.message);
  }
};
if (!IS_PRODUCTION) {
  seedDefaultGuardrail();
}

// Middleware to authorize Tutors or Admins
const authorizeTutorAdmin = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    if (user.role !== 'admin' && user.role !== 'tutor') {
      return res.status(403).json({ error: 'Forbidden: Admin or Tutor access required' });
    }
    req.user = user;
    next();
  })(req, res, next);
};

// Rate limiting middleware (configurable, defaults to 30 requests/minute per IP)
const rateLimitCache = {};
const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  if (!rateLimitCache[ip]) {
    rateLimitCache[ip] = [];
  }
  // Filter out timestamps older than 60s
  rateLimitCache[ip] = rateLimitCache[ip].filter(t => now - t < 60000);
  
  const limit = parseInt(process.env.CHAT_RATE_LIMIT, 10) || 30;
  if (rateLimitCache[ip].length >= limit) {
    chatMetrics.totalErrors++;
    return res.status(429).json({ error: 'Too many requests. Please take a deep breath and try again in a minute!' });
  }
  rateLimitCache[ip].push(now);
  next();
};

// Helper to interact with the Gemini API (supports Google's OpenAI-compatible endpoint)
// IMPORTANT: Set GEMINI_API_KEY in your .env file — never hardcode credentials here.
const getLlmApiConfig = () => {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  const baseUrl = (process.env.GEMINI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').trim();
  const model = (process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || 'gemini-2.5-flash').trim();
  if (!apiKey) {
    console.warn('[WARNING] GEMINI_API_KEY is not set. LLM calls will fail. Please set it in middlewareNode/.env');
  }
  return { apiKey, baseUrl, model };
};

// Observability metrics endpoint
router.get('/metrics', authorizeTutorAdmin, (req, res) => {
  const avgLatency = chatMetrics.totalLlmCalls > 0 ? (chatMetrics.totalLatencyMs / chatMetrics.totalLlmCalls).toFixed(2) : 0;
  res.json({
    totalRequests: chatMetrics.totalRequests,
    totalEscalations: chatMetrics.totalEscalations,
    totalErrors: chatMetrics.totalErrors,
    totalLlmCalls: chatMetrics.totalLlmCalls,
    averageLatencyMs: parseFloat(avgLatency)
  });
});

// Educator API: Get student coaching sessions with topic, date range filters, student search & pagination
router.get('/educator/sessions', authorizeTutorAdmin, async (req, res) => {
  try {
    const { topic, student, startDate, endDate, skip = 0, limit = 10 } = req.query;
    const query = {};

    if (topic && topic !== 'All Topics') {
      query.topic = { $regex: topic, $options: 'i' };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Retrieve sessions and populate user profiles
    let sessions = await ChatSession.find(query)
      .populate('userId', 'username firstName lastName')
      .sort({ createdAt: -1 });

    // Filter by student details if specified (name or username)
    if (student) {
      const regex = new RegExp(student, 'i');
      sessions = sessions.filter(s => 
        s.userId && (
          regex.test(s.userId.username) || 
          regex.test(s.userId.firstName) || 
          regex.test(s.userId.lastName)
        )
      );
    }

    const total = sessions.length;
    const paginatedSessions = sessions.slice(Number(skip), Number(skip) + Number(limit));

    res.json({
      sessions: paginatedSessions,
      total
    });
  } catch (error) {
    console.error('Error fetching educator sessions:', error.message);
    res.status(500).json({ error: 'failed to fetch educator sessions' });
  }
});

// Educator API: Get transcript (all messages) for a specific session
router.get('/educator/session/:sessionId/transcript', authorizeTutorAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await ChatMessage.find({ sessionId }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
    res.status(500).json({ error: 'failed to fetch session transcript' });
  }
});

// 1. Create a new session
router.post('/session', requireAuth, async (req, res) => {
  try {
    let { userId, topic } = req.body;
    if (!userId && req.user) {
      userId = req.user._id || req.user.id || req.user.username;
    }
    if (!userId || !topic) {
      return res.status(400).json({ error: 'userId and topic are required' });
    }

    // Enforce ownership: students cannot create sessions on behalf of other users
    const callerId = (req.user._id || req.user.id || '').toString();
    const callerUsername = req.user.username || '';
    if (
      req.user.role !== 'admin' &&
      callerId !== userId.toString() &&
      callerUsername !== userId.toString()
    ) {
      return res.status(403).json({ error: 'Forbidden: cannot create session for another user' });
    }

    // Resolve matching template
    const cleanTopic = (topic || '').trim().toLowerCase();
    let template = await CoachTemplate.findOne({ 
      $or: [
        { topic: cleanTopic },
        { topic: new RegExp('^' + cleanTopic + '$', 'i') }
      ],
      isEnabled: true 
    });
    if (!template) {
      template = await CoachTemplate.findOne({ name: 'General Tutoring' }) || await CoachTemplate.findOne({ name: 'General Coaching' });
    }

    const session = new ChatSession({
      userId,
      topic,
      phase: 'warm-up',
      status: 'active',
      templateId: template ? template._id : null
    });

    await session.save();
    res.status(201).json({ session });
  } catch (error) {
    console.error("Error creating session:", error.message);
    res.status(500).json({ error: 'failed to create session' });
  }
});

// 2. Get historical sessions for a user
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const { userId, skip = 0, limit = 10 } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Enforce ownership: callers can only fetch their own sessions.
    // Note: Tutors and admins have read-only observation access to review student coaching sessions,
    // whereas write/mutate operations (/message, /end) are restricted to session owners and admins.
    const callerId = (req.user._id || req.user.id || '').toString();
    const callerUsername = req.user.username || '';
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'tutor' &&
      callerId !== userId.toString() &&
      callerUsername !== userId.toString()
    ) {
      return res.status(403).json({ error: "Forbidden: cannot access another user's sessions" });
    }

    const sessions = await ChatSession.find({ userId })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));
    const total = await ChatSession.countDocuments({ userId });
    res.json({ sessions, total });
  } catch (error) {
    res.status(500).json({ error: 'failed to fetch sessions' });
  }
});

// 3. Get specific session details and messages
router.get('/session/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Enforce ownership: only session owner or tutor/admin can access
    const callerId = (req.user._id || req.user.id || '').toString();
    const callerUsername = req.user.username || '';
    const sessionOwner = (session.userId || '').toString();
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'tutor' &&
      sessionOwner !== callerId &&
      sessionOwner !== callerUsername
    ) {
      return res.status(403).json({ error: "Forbidden: cannot access another user's session" });
    }

    const messages = await ChatMessage.find({ sessionId }).sort({ createdAt: 1 });
    res.json({ session, messages });
  } catch (error) {
    res.status(500).json({ error: 'failed to fetch session details' });
  }
});

// 4. Send message to session (with SSE streaming)
router.post('/message', requireAuth, rateLimiter, async (req, res) => {
  chatMetrics.totalRequests++;
  const start = Date.now();
  const { sessionId, message } = req.body;
  
  try {
    if (!sessionId || !message) return res.status(400).json({ error: 'sessionId and message are required' });

    const session = await ChatSession.findById(sessionId);
    if (!session || session.status !== 'active') {
      return res.status(400).json({ error: 'Invalid or inactive session' });
    }

    // Enforce ownership: only session owner or admin can post messages to session
    const callerId = (req.user._id || req.user.id || '').toString();
    const callerUsername = req.user.username || '';
    const sessionOwner = (session.userId || '').toString();
    if (
      req.user.role !== 'admin' &&
      sessionOwner !== callerId &&
      sessionOwner !== callerUsername
    ) {
      return res.status(403).json({ error: "Forbidden: cannot send message to another user's session" });
    }

    // Save user message
    await ChatMessage.create({ sessionId, role: 'user', content: message });

    // Fetch previous messages for context
    const previousMessages = await ChatMessage.find({ sessionId }).sort({ createdAt: 1 }).limit(20);

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 1. Guardrails Check: Detect crisis using dynamic database configuration
    let isCrisis = false;
    let crisisResponse = '';
    try {
      const dbGuardrail = await Guardrail.findOne();
      const keywords = dbGuardrail && dbGuardrail.keywords.length > 0 
        ? dbGuardrail.keywords 
        : [
            'suicide', 'kill myself', 'wanna die', 'want to die', 'cut myself', 
            'hurt myself', 'hurting myself', 'end my life', 'commit suicide', 'hanging myself', 
            'overdosing', 'self-harm', 'self harm', 'kill me', 'abuse me',
            'hitting me', 'hurting me', 'beat me', 'abused'
          ];
      crisisResponse = dbGuardrail && dbGuardrail.responseMessage 
        ? dbGuardrail.responseMessage 
        : "I hear you, and I want to make sure you are safe. Please know you are not alone, and there is support available. You can connect with someone who can support you 24/7 by calling or texting the Suicide & Crisis Lifeline at 988, or reaching out to a trusted teacher, parent, or adult. I'm going to notify our support team to check in and see how we can help you.";
      
      const normalizedMsg = message.toLowerCase();
      isCrisis = keywords.some(keyword => normalizedMsg.includes(keyword.toLowerCase()));
    } catch (dbErr) {
      console.warn("Failed to load guardrails from DB, falling back to static:", dbErr.message);
      isCrisis = detectCrisis(message);
      crisisResponse = getCrisisResponse();
    }

    if (isCrisis) {
      chatMetrics.totalEscalations++;
      session.escalated = true;
      session.status = 'completed'; // Complete immediately to preserve safety
      session.summary = 'Session escalated due to safety guardrail activation.';
      session.actions = ['Connect with safety support via 988 Suicide & Crisis Lifeline.'];
      await session.save();

      // Save assistant message to DB
      await ChatMessage.create({ sessionId, role: 'assistant', content: crisisResponse });

      // Send response chunk in standard OpenAI structure
      const chunk = JSON.stringify({
        choices: [{ delta: { content: crisisResponse } }]
      });
      res.write(`data: ${chunk}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();

      // Log the escalation
      logLlmCall({
        timestamp: new Date().toISOString(),
        sessionId,
        type: 'escalation',
        message: 'Crisis words detected',
        latencyMs: Date.now() - start,
        status: 'escalated'
      });
      return;
    }

    // 2. Fetch coach template or fallback to default prompts
    let systemPrompt = '';
    if (session.templateId) {
      const template = await CoachTemplate.findById(session.templateId);
      if (template) {
        systemPrompt = template.systemPrompt;
      }
    }
    if (!systemPrompt) {
      systemPrompt = getSystemPrompt(session.topic, session.phase);
    }
    // Enforce student coaching standards
    systemPrompt += `\n\nAdditional Instructions: Be extremely friendly, warm, encouraging, and supportive as an AI Tutor for students. Use emojis occasionally, keep responses short (2-3 sentences), simple, and clear. Guide them dynamically based on their feelings and thoughts. Do not show them option screens. Ask supportive questions to guide them through their learning/chess challenges.`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...previousMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    ];

    const { apiKey, baseUrl, model } = getLlmApiConfig();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/chat/completions`;

    let apiResponse;
    let fallbackToLocal = false;
    let errorText = '';

    try {
      apiResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: apiMessages,
          stream: true
        })
      });

      if (!apiResponse.ok) {
        errorText = await apiResponse.text();
        console.error(`LLM API returned error: ${apiResponse.status} - ${errorText}`);
        fallbackToLocal = true;
      }
    } catch (fetchErr) {
      console.error(`LLM API fetch exception: ${fetchErr.message}`);
      errorText = fetchErr.message;
      fallbackToLocal = true;
    }

    if (fallbackToLocal) {
      chatMetrics.totalErrors++;
      try {
        console.log("LLM API failed. Falling back to local NLP AI Coach...");
        const analysis = await chatService.processMessage(message);
        const localResponse = chatService.getCoachingResponse(session.topic, session.phase, analysis.intent, message);
        
        // Save assistant message to DB
        await ChatMessage.create({ sessionId, role: 'assistant', content: localResponse });
        
        // Simple heuristic to advance phase
        const messageCount = previousMessages.length + 2; // + user + assistant
        if (session.phase === 'warm-up' && messageCount >= 4) session.phase = 'explore';
        else if (session.phase === 'explore' && messageCount >= 8) session.phase = 'teach';
        else if (session.phase === 'teach' && messageCount >= 12) session.phase = 'plan';
        else if (session.phase === 'plan' && messageCount >= 16) session.phase = 'reflection';
        await session.save();

        // Write response to stream
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: localResponse } }] })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        
        logLlmCall({
          timestamp: new Date().toISOString(),
          sessionId,
          model: 'local-fallback',
          error: errorText,
          latencyMs: Date.now() - start,
          status: 'success'
        });
        return;
      } catch (fallbackError) {
        console.error("Local NLP fallback failed:", fallbackError.message);
      }

      const errorResponse = 'Sorry, I am having trouble connecting right now. Can we try again?';
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: errorResponse } }] })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      
      logLlmCall({
        timestamp: new Date().toISOString(),
        sessionId,
        model,
        error: errorText || 'API and Fallback Failed',
        latencyMs: Date.now() - start,
        status: 'error'
      });
      return;
    }

    const reader = apiResponse.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullResponseText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);

      buffer += chunk;
      let lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last partial line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const data = JSON.parse(jsonStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullResponseText += content;
            }
          } catch (e) {
            // Ignore JSON parse errors for partial chunks
          }
        }
      }
    }

    if (buffer) {
      const trimmed = buffer.trim();
      if (trimmed && trimmed !== 'data: [DONE]' && trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6);
        try {
          const data = JSON.parse(jsonStr);
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            fullResponseText += content;
          }
        } catch (e) {}
      }
    }

    // Save the final assembled response
    await ChatMessage.create({ sessionId, role: 'assistant', content: fullResponseText || 'Session complete' });

    // Simple heuristic to advance phase
    const messageCount = previousMessages.length + 2; // + user + assistant
    if (session.phase === 'warm-up' && messageCount >= 4) session.phase = 'explore';
    else if (session.phase === 'explore' && messageCount >= 8) session.phase = 'teach';
    else if (session.phase === 'teach' && messageCount >= 12) session.phase = 'plan';
    else if (session.phase === 'plan' && messageCount >= 16) session.phase = 'reflection';
    await session.save();

    // Log LLM call observability details
    const latency = Date.now() - start;
    chatMetrics.totalLlmCalls++;
    chatMetrics.totalLatencyMs += latency;
    logLlmCall({
      timestamp: new Date().toISOString(),
      sessionId,
      model,
      latencyMs: latency,
      status: 'success'
    });
    res.end();

  } catch (error) {
    console.error("Error in chat message route:", error.message);
    chatMetrics.totalErrors++;
    logLlmCall({
      timestamp: new Date().toISOString(),
      sessionId,
      error: error.message,
      latencyMs: Date.now() - start,
      status: 'fatal'
    });
    if (!res.headersSent) {
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "An unexpected error occurred. Let's try talking again!" } }] })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// 5. End session and generate summary/actions
router.post('/session/:sessionId/end', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ChatSession.findById(sessionId);
    if (!session || session.status !== 'active') {
      return res.status(400).json({ error: 'Invalid or inactive session' });
    }

    // Enforce ownership: only session owner or admin can end session
    const callerId = (req.user._id || req.user.id || '').toString();
    const callerUsername = req.user.username || '';
    const sessionOwner = (session.userId || '').toString();
    if (
      req.user.role !== 'admin' &&
      sessionOwner !== callerId &&
      sessionOwner !== callerUsername
    ) {
      return res.status(403).json({ error: "Forbidden: cannot end another user's session" });
    }

    // Fetch all messages in this session to extract the user's committed plan
    const messages = await ChatMessage.find({ sessionId }).sort({ createdAt: 1 });
    
    // Call Gemini to summarize and generate actions dynamically
    try {
      const historyText = messages.map(m => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.content}`).join('\n');
      const prompt = `Here is the transcript of a coaching session on the topic "${session.topic}":\n\n${historyText}\n\n${getSummaryPrompt()}`;
      
      const { apiKey, baseUrl, model } = getLlmApiConfig();
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const url = `${cleanBaseUrl}/chat/completions`;

      const apiResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        
        // Clean markdown block wrappers if present (e.g. ```json ... ```)
        let cleanedContent = content.trim();
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.substring(7);
        }
        if (cleanedContent.endsWith('```')) {
          cleanedContent = cleanedContent.substring(0, cleanedContent.length - 3);
        }
        cleanedContent = cleanedContent.trim();

        const parsed = JSON.parse(cleanedContent);
        session.summary = parsed.summary || `Coaching session on ${session.topic} complete.`;
        session.actions = parsed.actions || [];
      } else {
        throw new Error('LLM summary request failed');
      }
    } catch (e) {
      console.warn("LLM summary generation failed, falling back to local service:", e.message);
      const { summary, actions } = chatService.generateSessionSummary(messages, session.topic);
      session.summary = summary;
      session.actions = actions;
    }

    session.status = 'completed';
    await session.save();

    res.json({ session });
  } catch (error) {
    console.error("Error ending session:", error.message);
    res.status(500).json({ error: 'failed to end session' });
  }
});

// Admin/Tutor: Get all templates
router.get('/templates', authorizeTutorAdmin, async (req, res) => {
  try {
    const templates = await CoachTemplate.find().sort({ createdAt: -1 });
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Admin/Tutor: Create new template
router.post('/templates', authorizeTutorAdmin, async (req, res) => {
  try {
    const { name, ageGroup, topic, systemPrompt, isEnabled } = req.body;
    if (!name || !topic || !systemPrompt) {
      return res.status(400).json({ error: 'Name, topic and systemPrompt are required' });
    }
    const newTemplate = new CoachTemplate({ name, ageGroup, topic, systemPrompt, isEnabled });
    await newTemplate.save();
    res.status(201).json({ template: newTemplate });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

// Admin/Tutor: Update template
router.put('/templates/:id', authorizeTutorAdmin, async (req, res) => {
  try {
    const { name, ageGroup, topic, systemPrompt, isEnabled } = req.body;
    const template = await CoachTemplate.findByIdAndUpdate(
      req.params.id,
      { name, ageGroup, topic, systemPrompt, isEnabled },
      { new: true }
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ template });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Admin/Tutor: Delete template
router.delete('/templates/:id', authorizeTutorAdmin, async (req, res) => {
  try {
    const template = await CoachTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Admin/Tutor: Get safety guardrails configuration
router.get('/guardrails', authorizeTutorAdmin, async (req, res) => {
  try {
    let guardrail = await Guardrail.findOne();
    if (!guardrail) {
      guardrail = new Guardrail();
      await guardrail.save();
    }
    res.json({ guardrail });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guardrails' });
  }
});

// Admin/Tutor: Update safety guardrails configuration
router.put('/guardrails', authorizeTutorAdmin, async (req, res) => {
  try {
    const { keywords, responseMessage } = req.body;
    if (!keywords || !responseMessage) {
      return res.status(400).json({ error: 'Keywords list and responseMessage are required' });
    }
    let guardrail = await Guardrail.findOne();
    if (!guardrail) {
      guardrail = new Guardrail();
    }
    guardrail.keywords = keywords;
    guardrail.responseMessage = responseMessage;
    await guardrail.save();
    res.json({ guardrail });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update guardrails' });
  }
});

// Admin/Tutor: View system logs (llm.log)
router.get('/educator/logs', authorizeTutorAdmin, async (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.json({ logs: [] });
    }
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    const recentLines = lines.slice(-150).map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return { text: line };
      }
    });
    res.json({ logs: recentLines });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// User: Get AI-driven Socratic feedback for a chess move played
router.post('/chess-feedback', requireAuth, async (req, res) => {
  const { fenBefore, fenAfter, moveUci, bestMove, score, moveIndicator, nextStepHint } = req.body;
  
  try {
    const { apiKey, baseUrl, model } = getLlmApiConfig();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/chat/completions`;

    // Construct a friendly prompt for a kid-friendly Chess Coach mascot
    const prompt = `You are a warm, encouraging, and highly educational AI Chess Coach. A student has just made a chess move.

Here are the move details:
- Move Played: ${moveUci || 'unknown'}
- Move Indicator/Quality: ${moveIndicator || 'Neutral'}
- FEN Position Before Move: ${fenBefore || ''}
- FEN Position After Move: ${fenAfter || ''}
- Recommended Best Move: ${bestMove || 'unknown'}
- Engine Next Step Hint: ${nextStepHint || 'unknown'}
- Engine Score Change (approximate): ${score !== null && score !== undefined ? score : 'unknown'}

Please explain this move to the student in a Socratic, warm, and highly educational tone. Keep your explanation to 2-3 sentences max.
Rules:
1. If the move is good/best, praise them and explain the specific strategic benefit (e.g. controls center, develops piece, guards material).
2. If the move is a mistake or blunder, EXPLAIN EXACTLY WHY using the "Engine Next Step Hint". For example, if the hint shows the opponent capturing a piece, kindly explain "if you play that, they can capture your knight!". Point out the specific tactical downside (fork, pin, hanging piece, exposed king). Then ask a guiding question to help them find the best move.
3. Be specific about the pieces involved. Do not mention FEN, UCI, centipawns, or engine numbers. Speak like an expert human chess tutor.`;

    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a warm, supportive, kid-friendly AI Chess Coach.' },
          { role: 'user', content: prompt }
        ],
        stream: false
      })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`LLM API returned error: ${apiResponse.status} - ${errorText}`);
    }

    const data = await apiResponse.json();
    const feedback = data?.choices?.[0]?.message?.content;
    
    if (!feedback) {
      throw new Error('No feedback content returned from LLM');
    }

    res.json({ success: true, feedback: feedback.trim() });
  } catch (error) {
    console.error('Error generating chess feedback:', error.message);
    res.status(500).json({ error: 'Failed to generate chess feedback' });
  }
});

module.exports = router;
