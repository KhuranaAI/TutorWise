/**
 * TutorWise digital-module grader.
 *
 * gradeSubmission(key, submission) -> result
 *
 *   - multiple_choice: scored here, deterministically.
 *   - short_answer / long_answer: returned as `pending` with the verbatim
 *     rubric attached, ready for an AI marker or a teacher. Call
 *     applyWrittenScore() when that score comes back.
 *
 * Rubric text is passed through VERBATIM (same rule as the Grader app's
 * lib/grading/prompt.ts): the criteria are the teacher's reviewed words.
 *
 * No dependencies. Runs in Node 18+ and in the browser.
 *
 * CLI:  node grade.mjs <key.json> <submission.json>
 */

export const RESULT_SCHEMA = "tutorwise.grade-result/1";
export const SUBMISSION_SCHEMA = "tutorwise.submission/1";

/** Throws if the submission does not belong to this key or is malformed. */
export function validateSubmission(key, submission) {
  if (!submission || submission.schema !== SUBMISSION_SCHEMA) {
    throw new Error(`submission.schema must be "${SUBMISSION_SCHEMA}"`);
  }
  if (submission.module_id !== key.module_id) {
    // A record's version is part of its id: a v1 submission must never be
    // graded against a v2 key, because the questions may differ.
    throw new Error(`submission is for ${submission.module_id}, key is ${key.module_id}`);
  }
  if (!Array.isArray(submission.answers)) throw new Error("submission.answers must be an array");
  const known = new Set(key.questions.map((q) => q.question_id));
  for (const a of submission.answers) {
    if (!known.has(a.question_id)) throw new Error(`unknown question_id ${a.question_id}`);
  }
}

/** Verbatim rubric block for a written question (mirrors Grader renderRubric). */
export function rubricFor(q) {
  const out = {};
  if (q.model_answer) out.model_answer = q.model_answer;
  if (q.marking_criteria?.length) out.marking_criteria = q.marking_criteria;
  if (q.rubric_levels?.length) out.rubric_levels = [...q.rubric_levels].sort((a, b) => b.score - a.score);
  if (q.grading_notes) out.grading_notes = q.grading_notes;
  if (q.accepted_answer_guidance) out.accepted_answer_guidance = q.accepted_answer_guidance;
  return out;
}

const isBlank = (v) => v == null || String(v).trim() === "";

export function gradeSubmission(key, submission) {
  validateSubmission(key, submission);
  const answers = new Map(submission.answers.map((a) => [a.question_id, a.answer]));

  const questions = key.questions.map((q) => {
    const answer = answers.get(q.question_id) ?? null;
    const base = {
      question_id: q.question_id,
      number: q.number,
      type: q.type,
      max_marks: q.marks,
      primary_skill: q.primary_skill ?? null,
      secondary_skill: q.secondary_skill ?? null,
      answer,
    };

    if (q.type === "multiple_choice") {
      const correct = answer === q.correct_option;
      return {
        ...base,
        status: "graded",
        method: "deterministic_mc",
        score: correct ? q.marks : 0,
        correct_option: q.correct_option,
        // Why the chosen distractor is wrong -- useful feedback for the student.
        feedback: !correct && answer && q.distractor_notes ? q.distractor_notes[answer] ?? null : null,
      };
    }

    if (isBlank(answer)) {
      // A blank written answer is 0 under every rubric in the database
      // (see each long_answer's 0-level descriptor). No need to spend a model call.
      return { ...base, status: "graded", method: "blank", score: 0 };
    }

    return {
      ...base,
      status: "pending",
      method: "rubric_pending",
      score: null,
      evidence_paragraphs: q.evidence_paragraphs ?? [],
      question_text: q.text,
      rubric: rubricFor(q),
    };
  });

  return summarize({
    schema: RESULT_SCHEMA,
    module_id: key.module_id,
    resource_id: key.resource_id,
    submission_id: submission.submission_id ?? null,
    graded_at: new Date().toISOString(),
    questions,
  }, key);
}

/**
 * Record a written-answer score from an AI marker or teacher.
 * Returns a new result; does not mutate the input.
 */
export function applyWrittenScore(result, key, questionId, score, { method = "teacher", reasoning = null } = {}) {
  const questions = result.questions.map((q) => {
    if (q.question_id !== questionId) return q;
    if (!Number.isInteger(score) || score < 0 || score > q.max_marks) {
      throw new Error(`${questionId}: score must be a whole number 0..${q.max_marks}`);
    }
    return { ...q, status: "graded", method, score, reasoning };
  });
  return summarize({ ...result, questions }, key);
}

function summarize(result, key) {
  const graded = result.questions.filter((q) => q.status === "graded");
  const pending = result.questions.filter((q) => q.status === "pending");
  const awarded = graded.reduce((s, q) => s + q.score, 0);
  return {
    ...result,
    status: pending.length ? "needs_written_grading" : "complete",
    total_marks: key.total_marks,
    marks_awarded: awarded,
    marks_graded: graded.reduce((s, q) => s + q.max_marks, 0),
    marks_pending: pending.reduce((s, q) => s + q.max_marks, 0),
    percent: pending.length ? null : Math.round((awarded / key.total_marks) * 1000) / 10,
  };
}

// ---- CLI ------------------------------------------------------------------
const isMain = typeof process !== "undefined" && process.argv?.[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/").replace(/^(?=[A-Za-z]:)/, "/")}`).href;

if (isMain) {
  const { readFileSync } = await import("node:fs");
  const [keyPath, subPath] = process.argv.slice(2);
  if (!keyPath || !subPath) {
    console.error("usage: node grade.mjs <key.json> <submission.json>");
    process.exit(1);
  }
  const read = (p) => JSON.parse(readFileSync(p, "utf8"));
  console.log(JSON.stringify(gradeSubmission(read(keyPath), read(subPath)), null, 2));
}
