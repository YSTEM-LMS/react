const { NlpManager } = require('node-nlp');
const trainingData = require('./nlpTrainingData');

// Initialize NLP Manager
const manager = new NlpManager({ languages: ['en'], forceNER: true });

// Load training data into the classifier
trainingData.forEach(item => {
  item.utterances.forEach(utterance => {
    manager.addDocument('en', utterance, item.intent);
  });
});

let isTrained = false;

/**
 * Trains the local NLP model at server startup (takes < 100ms)
 */
const trainModel = async () => {
  if (isTrained) return;
  console.log('Training local AI Chatbot model...');
  const start = Date.now();
  await manager.train();
  isTrained = true;
  console.log(`AI Chatbot trained successfully in ${Date.now() - start}ms!`);
};

/**
 * Classifies a user message to detect their emotional intent and sentiment
 * @param {string} message 
 */
const processMessage = async (message) => {
  await trainModel(); // Ensure model is trained
  const result = await manager.process('en', message);
  return {
    intent: result.intent || 'None',
    score: result.score || 0,
    sentiment: result.sentiment || { score: 0, type: 'neutral' }
  };
};

/**
 * Selects an empathetic, coaching response based on the Phase + Intent + Topic matrix
 * @param {string} topic 
 * @param {string} phase 
 * @param {string} intent 
 * @param {string} message 
 */
const getCoachingResponse = (topic, phase, intent, message) => {
  const t = (topic || '').toLowerCase();
  
  // 1. Warm-up Phase
  if (phase === 'warm-up') {
    if (intent === 'feeling.frustrated') {
      return `I hear you. Working on ${topic} can definitely feel tough or frustrating at times. What usually triggers that feeling for you?`;
    }
    if (intent === 'feeling.overwhelmed') {
      return `It sounds like you are carrying a lot right now. Focusing on ${topic} is a great way to start making things more manageable. What is making you feel most overwhelmed today?`;
    }
    if (intent === 'feeling.confident') {
      return `That's fantastic! Feeling confident is a great place to start when working on ${topic}. What has been going well for you lately?`;
    }
    return `Hi there! Let's talk about ${topic}. How are you feeling about it today?`;
  }
  
  // 2. Explore Phase
  if (phase === 'explore') {
    if (intent === 'feeling.frustrated' || intent === 'feeling.overwhelmed') {
      return `I completely understand. A lot of students face that exact same struggle. When you are right in the middle of it, what would you say is the absolute hardest part?`;
    }
    if (intent === 'feeling.unmotivated') {
      return `That is very real. Sometimes it's really hard to find the energy to care. What is one thing about ${topic} that makes you feel like it's just not worth the effort?`;
    }
    return `Thank you for sharing that with me. Can you tell me about a specific situation recently where you felt stuck or challenged with ${topic}?`;
  }
  
  // 3. Teach Phase (Dynamic based on topic)
  if (phase === 'teach') {
    if (t.includes('growth') || t.includes('mindset')) {
      return `Here is a strategy called "The Power of Yet." Instead of telling yourself "I can't do this," try adding the word yet: "I can't do this *yet*." It reminds your brain that it is still growing! Does that feel like something you could try?`;
    }
    if (t.includes('time') || t.includes('manage')) {
      return `Let's try a technique called "Time Chunking." Pick one task and work on it for just 15 minutes, then give yourself a 2-minute break. It makes a giant mountain feel like tiny, easy steps! What do you think of that idea?`;
    }
    if (t.includes('frustrat') || t.includes('deal')) {
      return `When frustration starts rising, try the "Take 3" rule: stop what you're doing, take 3 deep, slow breaths, and step away for just 2 minutes. It resets your brain's stress alarm! Do you think you could try that next time?`;
    }
    if (t.includes('goal') || t.includes('set')) {
      return `A powerful way to reach goals is to set "Micro-Goals." Instead of a giant goal like "I want to be a grandmaster," set a tiny daily goal like "I will solve 2 chess puzzles today." It builds huge momentum! How does that sound?`;
    }
    if (t.includes('math')) {
      return `When you're stuck on a math problem, a great strategy is to write down exactly what you know, identify what you need to find, and then tackle the first small calculation. Shall we try breaking down your problem together?`;
    }
    if (t.includes('homework') || t.includes('school')) {
      return `For school assignments, a great strategy is to highlight the key questions, explain the concept in your own words, and draft a quick outline. What part of the assignment feels most confusing right now?`;
    }
    return `One great strategy is to break big challenges down into much smaller pieces, then focus on only the very first step. It makes things feel way less overwhelming! How does that strategy sound to you?`;
  }
  
  // 4. Plan Phase
  if (phase === 'plan') {
    if (intent === 'response.no') {
      return `That's okay! We can adjust. What is one tiny, simple thing you *would* feel comfortable committing to next time you face a challenge?`;
    }
    return `Awesome! Let's make an "If-Then" plan for your brain. For example: "If I [encounter a challenge], then I will [use our strategy]." What will your specific "If-Then" plan be?`;
  }
  
  // 5. Reflection Phase
  if (phase === 'reflection') {
    if (intent === 'feeling.confident' || intent === 'response.yes') {
      return `I love that plan! You've shown incredible reflection and problem-solving skills today. Committing to a clear plan is a huge win. How are you feeling about trying this out?`;
    }
    return `That is a brilliant plan! You should be really proud of how you worked through this challenge today. I'm excited to see how it helps you. How do you feel about it now?`;
  }
  
  return `That is a really great point! Can you tell me a little more about how you think we can apply that to ${topic}?`;
};

/**
 * Dynamically generates a summary and action list based on user conversation history
 * @param {Array} messages 
 * @param {string} topic 
 */
const generateSessionSummary = (messages, topic) => {
  const userMessages = messages.filter(m => m.role === 'user');
  
  let userPlan = '';
  // Loop backwards to find the committed plan in the user's messages
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const text = userMessages[i].content.toLowerCase();
    if (text.includes('if') || text.includes('then') || text.includes('i will') || text.includes('i\'ll') || text.includes('try')) {
      userPlan = userMessages[i].content;
      break;
    }
  }
  
  if (!userPlan && userMessages.length > 0) {
    userPlan = userMessages[userMessages.length - 1].content;
  }
  
  const summary = `You completed a great tutoring session with your AI Tutor on ${topic || 'your chosen topic'}. You explored your challenges and designed a personal strategy to help you succeed!`;
  
  const actions = [];
  if (userPlan) {
    // Format into a nice clean If-Then plan
    if (userPlan.toLowerCase().includes('if') && userPlan.toLowerCase().includes('then')) {
      actions.push(userPlan);
    } else {
      actions.push(`If I face a challenge with ${topic || 'my tasks'}, then I will: "${userPlan}"`);
    }
  } else {
    // Default fallback based on topic
    const t = (topic || '').toLowerCase();
    if (t.includes('growth')) {
      actions.push("If I get stuck on a hard problem, then I will remind myself of the Power of Yet!");
    } else if (t.includes('time')) {
      actions.push("If I have a big assignment, then I will work in 15-minute chunks with short breaks.");
    } else if (t.includes('frustrat')) {
      actions.push("If I feel my frustration rising, then I will Take 3 deep breaths and step away for 2 minutes.");
    } else if (t.includes('math')) {
      actions.push("If I get stuck on a math problem, then I will write down what I know and try the first small step.");
    } else if (t.includes('homework') || t.includes('school')) {
      actions.push("If I have a school assignment, then I will read the questions carefully and do one chunk at a time.");
    } else {
      actions.push("If I encounter an obstacle, then I will break it down and focus on just the first step.");
    }
  }
  
  return { summary, actions };
};

// Initialize training in the background on load
trainModel().catch(console.error);

module.exports = {
  processMessage,
  getCoachingResponse,
  generateSessionSummary
};
