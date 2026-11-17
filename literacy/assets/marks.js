// How a tutor's mark on a written answer is worded for the student (and in the tutor's lists).
// Kept in its own file so that pages never depend on a newer export of a file the browser
// may still hold an older copy of.

/**
 * The tutor's marks on a written answer, as lines of text for the student.
 * A rubric may name its levels (for example "Code 30"); then the name is shown
 * instead of a number.
 */
export function markLines(module, item, w) {
  const out = [];
  const one = (key, score, max) => {
    if (score == null) return;
    const r = module?.rubrics?.[key];
    const level = r?.levels?.find((l) => l.score === score);
    if (level?.name) out.push(`${r.label || "Mark"}: ${level.name}`);
    else out.push(`${r?.label ? r.label + ": " : "Score: "}${score} out of ${max ?? r?.max}`);
  };
  one(item?.rubric, w.rubricScore, w.rubricMax);
  one(item?.rubric2, w.rubricScore2, w.rubricMax2);
  return out;
}
