# Makeup Balance agent: stage 1 notes (first dry run, 2026-11-27)

What was done: the written job description (`JOB.md`) was run once against live data, read-only, using the scheduler,
billing and the income sheet. The balances stored in the scheduler were already the product of a hand tally made on
2026-11-23, so the run also tests whether the written rules reproduce a hand tally. A second agent scanned seven weeks
of sessions for the data checks; its weekly sums were checked against the scheduler's month totals (they agree for
every student).

Result: 11 of 14 active students reproduce exactly. 3 differ, each because the written rules and the hand tally
disagree. One data check needs an answer from the owner. Nothing was saved; the change call was only dry-run.

Findings that should change the job description once the owner has ruled:
1. Expected weekly hours come from the sheet's Lessons/Week column, never from the scheduler's lessons_per_week field
   (they differ for several students).
2. Billed hours come from the hours on the tuition line in billing, never from the amount charged: credits and fees
   change the amount (an earlier hand calculation of billed hours from amounts was wrong for two students).
3. Hours bought separately (the sheet's additional-fee notes, for example "additional 2 hours") are not in the formula.
   Decide whether they count as billed hours; it changes a subscription student's result by up to the bought hours.
4. The "billed short" exception needs an exact definition. Proposal: take the shortfall (Lessons/Week x weeks minus
   billed hours) and exempt up to that many hours from the month's short weeks.
5. A missed lesson that was made up inside the same month is not owed twice. For subscription students,
   billed minus attended already nets it; the hand tally counted one such lesson twice.
6. To find unusual weeks, compare a week's hours with the sheet's Lessons/Week, not with the student's median week:
   the median produced many weak flags.
7. Add a check that weekly hours from get_week add up to month_summary for the month, and say so when they do not.
8. Flag a finished week with no lessons booked for a student who normally has them: counting it adds a full week to
   the balance.
9. The data checks worked: back-to-back sessions (two pairs found, each adding up to the usual length, so no flag),
   an attended session that carries a cancel note (one), and a lesson cancelled earlier was already gone from the
   schedule.
10. Report form that read well: who is owed (highest first), who did extra, who is at zero, what needs an answer.

Next: owner rulings, apply them to the job description, then stage 3 (rehearsal on a schedule: attach the Scheduler,
Billing and Google Sheets connectors; report only, never save).

## Second dry run, 2026-11-28 (with Scheduler, Billing and Google Sheets; nothing saved)
All four November weeks finished. After the owner's rulings (bought hours count as billed; a renewed block carries into
the next month; missed lessons stay owed until made up; an opening balance from before October), the run matches his
numbers for all 14 students. Run 1 of 2 needed. What moved: a student with no lessons booked in the last week (+ a full
week, confirmed); last-week over/under for three students; one subscription student zeroed because a mid-month renewal
covers the extra hours (6 h of the new block left for December); one student short in the week of Sep 28 (filed under
September) carried in as a +1 opening balance. Finding 5 above was wrong for that student: the October hours matched,
the owed hour came from the earlier week. Still open: whether a money credit on a bill settles an owed hour (owner kept
the student at the full balance), and whether bought hours noted on the October tab belong to October.
