# Centre Admin agent, stage 1 notes (by hand)

Job: month end for the tutoring centre. Check every lesson is marked and stop with a list if any are not; total the
billable hours per student; prepare each statement; flag anything unusual. Nothing is saved or given to a parent
without the owner's approval. A weekly job (unmarked lessons, makeups owed, free slots, a drafted message per parent)
is added once month end works.

## Session 1: read-only pass, 2026-11-27 (a Friday, last teaching day of the billing month)

Connectors: the scheduler (lessons and attendance) and billing (plans, charges, payments, statements).

Steps taken, in order:
1. Scheduler `month_summary` for the month. It lists the weeks that belong to the month (a week belongs to the month of
   its Wednesday) and, per student, lessons scheduled, attended, missed with and without credit, unmarked, billable
   hours and the makeup balance.
2. Billing `list_billing_students`: each student's plan (hourly, monthly, quarterly), rate or fee, and current balance.
3. Billing `month_overview` for the month being closed and for the month after it.

Checks, and what each one caught:
- **Unmarked lessons.** The only unmarked lessons were the ones on today's date that had not been taught yet. Rule for
  the skill: split unmarked lessons into "before today" (a real gap: stop and list them) and "today or later" (not a
  gap yet; say the month cannot be closed until they are marked).
- **Which month a charge belongs to.** The centre bills in advance: a month's charges are entered and its statements
  given in the first days of that month. The next month's charges were already in the ledger while the current month
  was still running. Rule: month end verifies charges that already exist before it generates anything; `generate_month`
  is only for students whose charge is missing, and only after a dry run.
- **"Balance" is not "overdue".** A student's current balance includes next month's advance charge. Rule: never report
  a balance as money owed without splitting it by month with `month_overview`; overdue means a closing balance on a
  month whose statement was already given.
- **Billed hours against delivered hours.** For hourly students the month's charge is rate times planned hours plus the
  supply fee. Delivered (billable) hours from the scheduler can differ from the planned hours that were billed, in both
  directions. Rule: show the difference per student next to the makeup balance and let the owner decide; never adjust a
  charge or a makeup balance to make them match.
- **Students with lessons but no billing plan.** Students marked inactive during the month can still have billable
  hours in it. Rule: list them and ask; do not create a plan or a charge.

Mistakes and near-misses to design out:
- Reading the total "owed to the centre" as a debt figure. Most of it was next month's charges, not yet due.
- Assuming the billing tool's hourly model (bill the hours after they happen) matches how the centre bills (in advance,
  on planned hours). Confirm the basis with the owner before any charge is generated.

Still to do with the owner before stage 2:
- How statements reach parents today, step by step.
- Confirm the billing basis for the coming month (in advance on planned hours, or the past month's delivered hours).
- Walk one statement end to end (`get_statement`, the document link, `mark_statement_given`) in dry-run.
- Close the month once the last day's lessons are marked, and note what changes.
