# Makeup Balance agent: job description

Written by the owner on 2026-11-27; names and amounts removed here because the repository is public. The named copy is
on the agent's project page in Jarvis. Status: stage 2 (written). Stage 1 was done by hand on 2026-11-23; the first
dry run against the written rules is in `STAGE1.md`.

## Goal
Keep every active student's makeup balance (in hours) correct in the Scheduler. Positive = hours owed to the student.
Negative = hours the student has done extra.

## Sources
- Scheduler: list_students, month_summary, get_week, get_student, get_makeups, adjust_makeup_balance.
- Billing: get_student_ledger (a tuition charge shows the hours billed).
- The income-calculations Google Sheet: one tab per month, column "Lessons/Week" = expected hours per week for every
  student, subscription students included.
Connectors to attach to a scheduled run: Scheduler, Billing, Google Sheets.

## Rules
- Active students only.
- Every missed lesson counts as owed, yellow (missed with credit) and red (missed, no credit) alike. Red is rarely used.
- Only fully finished weeks count. Never the current week.
- A week belongs to the month its Wednesday falls in (the scheduler's reporting month).
- Never change billing. This agent only sets makeup balances.

## Carry forward (owner's ruling, 2026-11-28)
Balances carry forward month to month. A missed lesson stays owed until it is made up: a normal month afterwards does
not clear it; the student has to do that many hours on top of the month's quota. The count starts at the October 2026
reporting month. Anything owed from before that (for example a short week the scheduler files under September) is the
student's opening balance, kept as an entry in the manual-adjustments list with reason "opening balance".

## Step 1: closed months (billed against attended)
For each finished month:
1. Hourly students: billed hours = the hours on that month's tuition charge in Billing.
2. Monthly or quarterly subscription students: billed hours = Lessons/Week from that month's tab x weeks in the month.
3. Attended hours = attended_hours for the student in month_summary.
4. Hours bought on top of the plan (the sheet's Additional Fee Notes, e.g. "additional 2 hours") are added to billed
   hours for the month they were bought for. Bought hours that are not used become owed hours (owner's ruling,
   2026-11-28). A bought block that says it runs past the month (e.g. "covers lessons through <date>") is counted in
   the months it covers; ask the owner how to split it.
   Ruling 2026-11-28: when a subscription student uses up the month's hours early and buys a new block, hours done
   beyond the month's quota are the first hours of the new block, not extra. The month nets to 0 and the block's
   remaining hours carry into the next month as that month's expected hours.
5. Month result = billed - attended.

## Step 2: current month, week by week
For each finished week of the current month:
1. Expected = the student's Lessons/Week from that month's tab, plus any hours bought for this month (Step 1, item 4),
   spread over the month's weeks.
2. Actual = attended hours that week, from get_week.
3. Week result = expected - actual.
4. Exception: if the month was already billed short to cover a short week (billed hours < Lessons/Week x weeks), do not
   count that week as owed. Example: a student billed 14 h instead of 16 h because one week had only one lesson booked.

## Step 3: check the data before saving
Flag to the owner instead of guessing:
- Back-to-back or overlapping sessions that make a lesson longer than usual.
- Sessions marked attended that also have a cancel reason.
- Sessions that may not have happened, or hours far above a student's usual week.

## Manual adjustments (kept on top of every recalculation)
The owner sometimes changes a balance by hand (a promise to a family, a free lesson, a correction). Those changes live in
a list, one entry per change: student, hours (+ or -), date, reason. Every recalculation adds the list on top, so
"set to" never erases a change he made by hand. Source of the list: the Jarvis records (`agent/makeup_manual`), plus any
entry in the scheduler's makeup history that was not written by this agent: ask him once whether to keep it, then add
it to the list. Show the manual part separately in the reason, e.g. "... Manual +1 (free lesson, Nov 12)."

## Step 4: save
Balance = sum of all month and week results, plus the student's manual adjustments. Set it with adjust_makeup_balance (set_to_hours) with a reason that shows
the breakdown, for example: "Oct +4 (billed 16h, attended 12h). Nov vs 4h/week: wk Nov 2 2h (+2), wk Nov 9 4h (0),
wk Nov 16 4h (0). Week of Nov 23 not yet counted."

## Step 5: report
In short sentences: who is owed hours (highest first); who has done extra; who is at zero; anything flagged in step 3
that needs the owner's answer.

## When to run
After each week finishes (Friday, after attendance is logged) for the week-by-week part, and once at month end for the
billed-against-attended check.
