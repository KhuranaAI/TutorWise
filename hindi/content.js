/* =====================================================
   Bolo! — course content
   -----------------------------------------------------
   All teaching content lives here as plain data so new
   modules / words can be added without touching app.js.

   A module describes:
   - pattern.parts   the fixed sentence blocks (in order). The part
                     with role "verb" is the swappable slot.
   - verbs           the vocabulary that fits the slot.
   - mistakes        common wrong words we want to explain kindly.
   - english         how to render the English sentence for a verb.

   `accept` lists spellings we treat as correct when the learner
   types. Devanagari is accepted too. Near-misses (1 letter off)
   are accepted automatically with a spelling tip.
   ===================================================== */

window.BOLO_CONTENT = {
  version: 1,

  speaker: {
    name: "Meera",
    avatar: "👩🏽",
    gender: "female"
  },

  modules: [
    {
      id: "m1",
      number: 1,
      title: "What Am I Doing?",
      tagline: "Say what you're doing right now",
      minutes: "15–20",

      pattern: {
        // Displayed formula: Main + [verb] + rahi hoon
        formula: ["main", "VERB", "rahi", "hoon"],
        meaning: "I am [verb]-ing",
        parts: [
          {
            id: "main",
            role: "subject",
            roman: "Main",
            deva: "मैं",
            en: "I",
            sounds: "like “may” with a soft nasal n",
            accept: ["main", "mai", "mein", "mien", "mayn", "mae", "me", "मैं", "मै", "में"]
          },
          {
            id: "rahi",
            role: "aux",
            roman: "rahi",
            deva: "रही",
            en: "am …-ing",
            sounds: "ruh-HEE",
            accept: ["rahi", "rahee", "rehi", "rhi", "rahii", "rahy", "रही", "रहि"]
          },
          {
            id: "hoon",
            role: "aux",
            roman: "hoon",
            deva: "हूँ",
            en: "am",
            sounds: "rhymes with “moon”, slightly nasal",
            accept: ["hoon", "hun", "hu", "hoo", "huun", "huu", "hoon", "हूँ", "हूं", "हू", "हुँ", "हुं"]
          }
        ],
        // Combined label used when teaching "rahi hoon" as one chunk
        auxChunk: {
          roman: "rahi hoon",
          deva: "रही हूँ",
          en: "am …-ing",
          explain: "Shows the action is happening right now. “Rahi” is the form a female speaker uses."
        }
      },

      verbs: [
        { id: "eat",   roman: "kha",  deva: "खा",  en: "eat",   enLabel: "eat",            ing: ["eating"],             emoji: "🍛", sounds: "“khaa” — a breathy k, long a as in “father”", accept: ["kha", "khaa", "खा"] },
        { id: "drink", roman: "pee",  deva: "पी",  en: "drink", enLabel: "drink",          ing: ["drinking"],           emoji: "🥤", sounds: "just like English “pee”",                   accept: ["pee", "pi", "pii", "pie", "पी", "पि"] },
        { id: "sleep", roman: "so",   deva: "सो",  en: "sleep", enLabel: "sleep",          ing: ["sleeping"],           emoji: "😴", sounds: "like “so” in “so good”",                    accept: ["so", "soh", "sow", "soo", "सो"] },
        { id: "read",  roman: "padh", deva: "पढ़", en: "read",  enLabel: "read / study",   ing: ["reading", "studying"], emoji: "📖", sounds: "“puh” + a soft flapped “rh”",               accept: ["padh", "parh", "padd", "pad", "pard", "padth", "parh", "पढ़", "पढ"] },
        { id: "write", roman: "likh", deva: "लिख", en: "write", enLabel: "write",          ing: ["writing"],            emoji: "✍️", sounds: "like “lick” with a breathy end",            accept: ["likh", "lik", "lekh", "likk", "लिख"] },
        { id: "play",  roman: "khel", deva: "खेल", en: "play",  enLabel: "play",           ing: ["playing"],            emoji: "⚽", sounds: "like “kale” with a breathy k",              accept: ["khel", "khail", "kel", "khael", "kheil", "khayl", "खेल"] },
        { id: "watch", roman: "dekh", deva: "देख", en: "watch", enLabel: "watch / see",    ing: ["watching"],           emoji: "📺", sounds: "like “day” + a breathy kh",                accept: ["dekh", "dekh", "daekh", "dek", "deikh", "deckh", "देख"] },
        { id: "run",   roman: "daud", deva: "दौड़", en: "run",   enLabel: "run",            ing: ["running"],            emoji: "🏃🏽‍♀️", sounds: "rhymes with “loud” — “dowrh”",           accept: ["daud", "daur", "daudh", "daurh", "dowd", "dour", "dawd", "dod", "dor", "दौड़", "दौड"] }
      ],

      // Words learners commonly reach for. Each gets a friendly explanation.
      mistakes: [
        { words: ["raha", "rahaa", "rha", "रहा"], why: "“Raha” is what a male speaker says. Our speaker is female, so it's “rahi”." },
        { words: ["rahe", "rahey", "रहे"], why: "“Rahe” is for “we” or polite “you”. For “I” (female) use “rahi”." },
        { words: ["hai", "he", "hain", "hei", "है", "हैं"], why: "“Hai” means “is”. With “Main” (I) Hindi uses “hoon” (am)." },
        { words: ["mujhe", "mera", "meri", "maine"], why: "Close! For this pattern “I” is simply “Main”." },
        { words: ["i", "am", "is", "are", "im"], why: "Use the Hindi words: “Main” = I, “rahi hoon” = am …-ing." }
      ],

      english: function (verb, variant) {
        var ing = verb.ing[variant || 0] || verb.ing[0];
        return "I am " + ing + ".";
      }
    }
  ]
};
