/**
 * Safety Guardrails for AI Coaching
 * Detects self-harm, suicide, abuse, or threat keywords and routes to crisis support.
 */

const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'wanna die', 'want to die', 'cut myself', 
  'hurt myself', 'hurting myself', 'end my life', 'commit suicide', 'hanging myself', 
  'overdosing', 'self-harm', 'self harm', 'kill me', 'abuse me',
  'hitting me', 'hurting me', 'beat me', 'abused'
];

/**
 * Checks if a message contains any crisis or self-harm keywords.
 * @param {string} message 
 * @returns {boolean}
 */
const detectCrisis = (message) => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => normalized.includes(keyword));
};

/**
 * Returns the friendly supportive crisis redirection message.
 * @returns {string}
 */
const getCrisisResponse = () => {
  return "I hear you, and I want to make sure you are safe. Please know you are not alone, and there is support available. You can connect with someone who can support you 24/7 by calling or texting the Suicide & Crisis Lifeline at 988, or reaching out to a trusted teacher, parent, or adult. I'm going to notify our support team to check in and see how we can help you.";
};

module.exports = {
  detectCrisis,
  getCrisisResponse
};
