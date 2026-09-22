const mongoose = require("mongoose");

const GuardrailSchema = new mongoose.Schema(
  {
    keywords: {
      type: [String],
      required: true,
      default: [
        'suicide', 'kill myself', 'wanna die', 'want to die', 'cut myself', 
        'hurt myself', 'hurting myself', 'end my life', 'commit suicide', 'hanging myself', 
        'overdosing', 'self-harm', 'self harm', 'kill me', 'abuse me',
        'hitting me', 'hurting me', 'beat me', 'abused'
      ]
    },
    responseMessage: {
      type: String,
      required: true,
      default: "I hear you, and I want to make sure you are safe. Please know you are not alone, and there is support available. You can connect with someone who can support you 24/7 by calling or texting the Suicide & Crisis Lifeline at 988, or reaching out to a trusted teacher, parent, or adult. I'm going to notify our support team to check in and see how we can help you."
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model("Guardrail", GuardrailSchema);
