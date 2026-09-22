const trainingData = [
  {
    intent: 'greeting',
    utterances: [
      'hi',
      'hello',
      'hey',
      'good morning',
      'good afternoon',
      'hey there',
      'howdy',
      'hola',
      'hi bot',
      'hello coach'
    ]
  },
  {
    intent: 'feeling.frustrated',
    utterances: [
      "it's too hard",
      "i keep losing",
      "i want to quit",
      "im angry",
      "im annoyed",
      "this is frustrating",
      "i hate this",
      "i'm so mad",
      "i keep failing",
      "it makes no sense",
      "i am stuck",
      "this is stupid",
      "i can't do this",
      "it is impossible",
      "i'm getting annoyed",
      "i give up"
    ]
  },
  {
    intent: 'feeling.overwhelmed',
    utterances: [
      "i have too much to do",
      "so much homework",
      "no time",
      "im stressed",
      "i have no time",
      "it's too much",
      "i am overwhelmed",
      "too many things",
      "running out of time",
      "i'm exhausted",
      "so busy",
      "i'm feeling stressed",
      "i have a lot going on",
      "i can't handle this",
      "so much pressure"
    ]
  },
  {
    intent: 'feeling.unmotivated',
    utterances: [
      "i don't care",
      "this is boring",
      "i don't want to",
      "why bother",
      "im tired",
      "lazy",
      "i don't feel like it",
      "this is a waste of time",
      "bored",
      "why do i have to do this",
      "this doesn't matter",
      "i'd rather do nothing"
    ]
  },
  {
    intent: 'feeling.confident',
    utterances: [
      "i got this",
      "i feel great",
      "i can do it",
      "i won my game",
      "it was easy",
      "im happy",
      "confident",
      "i'm ready",
      "i did a good job",
      "i made progress",
      "feels good",
      "i think i understand",
      "i'm excited",
      "that makes total sense"
    ]
  },
  {
    intent: 'response.yes',
    utterances: [
      "yes",
      "yeah",
      "sure",
      "ok",
      "i think so",
      "correct",
      "sounds good",
      "yep",
      "absolutely",
      "i agree",
      "please",
      "definitely",
      "i will try",
      "okay",
      "sounds like a plan"
    ]
  },
  {
    intent: 'response.no',
    utterances: [
      "no",
      "nope",
      "not really",
      "i don't think so",
      "hardly",
      "nah",
      "never",
      "i disagree",
      "no way",
      "i can't",
      "i don't want to try"
    ]
  }
];

module.exports = trainingData;
