// ============================================================
// OSSLT prep content: shared pieces.
// Loaded first. The module files after it add passages to P and modules to MODULES.
//
// Facts about the test (question counts, word limits, marking codes, dates) were checked
// against EQAO's OSSLT page, test framework and scoring guides in November 2026.
// The practice test (m6) follows the scored blueprint: narrative 7 questions, information
// paragraph 6, news report 5 plus the short written answer, dialogue 5, twelve writing
// questions and the opinion essay: 35 selected-response + 2 written = 37.
//
// How content is written
//   P[key] = { form, title, paras:[...] }            paragraphs are numbered 1, 2, 3 on screen
//          or { form, title, intro, lines:[[speaker, text], ...] }   each turn is a numbered paragraph
//   A module = { id, title, time, blurb, test?, blocks:[...] }
//   Blocks:
//     { k:"label", text }                         a heading in the step list
//     { k:"lesson", title, html }                 a READ screen
//     { k:"q", ...question }                      an ANSWER screen
//     { k:"set", passage:key, qs:[...questions] } ANSWER screens beside a passage
//     { k:"write", id, mode:"short"|"essay", title, prompt, target, min, max, planner?, checklist, model?, passage? }
//   Questions: { id, type, skill, fam, prompt, explain, ... }
//     type "single"   options:[html], answer:index      (shuffled on screen unless fixed:true)
//     type "multi"    options:[html], answer:[indexes]
//     type "dropdown" parts:["text", {o:[choices], a:index}, ...]   (choices are shuffled on screen)
//     type "order"    items:[text in the CORRECT order]
//     type "sort"     cats:[names], items:[[text, index of its category]]   (rows are shuffled on screen)
//     skill = the label a student sees. fam = the official OSSLT skill it practises (see SKILL_FAMILY).
//   Prompts, options and explanations are HTML. Use typographic quotes (“ ” ’) inside them.
//   Never reuse or renumber an id: saved answers are stored by id. If a question's choices
//   or meaning change, give it a new id.
// ============================================================
const P = {};
const MODULES = [];

// The six skills in EQAO's framework, plus test knowledge.
const SKILL_FAMILY = {
  R1: "Reading: understanding what the text says directly",
  R2: "Reading: reading between the lines",
  R3: "Reading: making connections",
  W1: "Writing: developing a main idea with details",
  W2: "Writing: organizing ideas",
  W3: "Writing: spelling, grammar and punctuation",
  T:  "Knowing the test",
};

// Marking scales. These follow the code scales EQAO's markers use; the wording is ours.
const RUBRIC = {
  essay: {
    a: { label: "Topic development", codes: ["I", 10, 20, 30, 40, 50, 60],
      short: { I: "off topic", 10: "no opinion or no support", 20: "opinion unclear or thin", 30: "clear opinion, vague support", 40: "enough support, some specific", 50: "specific support, logical", 60: "thoughtful and convincing" },
      desc: {
        I: "Off topic, only repeats the prompt, comments on the task, or gives a bare yes or no. No credit.",
        10: "On the topic, but gives no opinion, or gives an opinion with no supporting details.",
        20: "The opinion is unclear, or only partly supported. Too few details, or the same one repeated.",
        30: "A clear opinion. The details are too few or too vague, and lapses in organization get in the way.",
        40: "A clear opinion that stays the same, with enough supporting details, though only some are specific. The organization is mechanical but works.",
        50: "A clear, consistent opinion with enough specific supporting details. The organization is logical.",
        60: "A clear, consistent opinion with specific, thoughtfully chosen details. The ideas build on each other in a thoughtful order.",
      } },
    b: { label: "Use of conventions", codes: ["I", 10, 20, 30, 40],
      short: { I: "off topic", 10: "errors block meaning", 20: "errors distract", 30: "errors do not distract", 40: "in control" },
      desc: {
        I: "Off topic or not a real attempt. No credit.",
        10: "Errors in spelling, grammar or punctuation get in the way of understanding, or there are fewer than 30 words to judge.",
        20: "Errors distract the reader from the message.",
        30: "There are errors, but they do not distract the reader.",
        40: "The writer is clearly in control of spelling, grammar and punctuation.",
      } },
    note: "The essay gets two separate codes and is marked as a first draft. Length alone earns nothing: markers look for a clear, consistent opinion backed by specific details. The real test’s box stops at about 500 words.",
  },
  short: {
    a: { label: "Reading response", codes: ["I", 10, 20, 30],
      short: { I: "off topic", 10: "little understanding", 20: "some understanding", 30: "accurate, specific, explained" },
      desc: {
        I: "Off topic, only repeats the question, or misreads the text. No credit.",
        10: "Shows very little understanding of the reading: the support is missing, tiny or beside the point. Listing details without explaining them lands here.",
        20: "Shows some understanding: gives a reason, but the support from the text is vague.",
        30: "Shows clear understanding: a reason, explained, with accurate and specific details from the reading.",
      } },
    b: null,
    note: "The short answer is about the news report and is marked for how well it shows understanding of the reading. The real test’s box stops at 100 words.",
  },
};

// Words on the student's home page.
const HOME = {
  intro: "Work through the modules in order, or jump to what you need. Each screen gives you one job: read, answer or write.",
  dates: "A scale score of <b>300 or higher</b> is successful. The fall 2026 test window is <b>November 3–30</b>; the spring window is <b>March 30 – April 19, 2027</b>.",
  how: `<h2>How this works</h2><ul><li><b>Read</b> a short lesson or a passage.</li><li><b>Answer</b> OSSLT-style questions. Check each one to see if you are right, and why.</li><li><b>Write</b> real responses. Check them against the checklist and a model, then get marks and comments from your tutor.</li><li><b>Test yourself</b> with a full-length practice test and see your results by skill.</li></ul><p class="muted small">Every passage here is an original practice text. The people in them are made up, and so are the towns in the news reports. Your work saves by itself while you are signed in.</p>`,
};
