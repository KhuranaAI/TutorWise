# Scheduler -> Google Sheet bridge

`Code.gs` + `appsscript.json` are a Google Apps Script the owner pastes into https://script.new and runs once (`setup`).
It reads the lesson scheduler's Firestore data as the signed-in owner, read-only, and writes a Google Sheet named
"TutorWise Scheduler Export" (tabs Meta, Students, Timetable, Sessions, Teachers), refreshed hourly.
The planner app and its morning agent read that sheet. Nothing here contains credentials or personal data.
