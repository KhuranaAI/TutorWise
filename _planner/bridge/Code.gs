/**
 * TutorWise Scheduler -> Google Sheet bridge.
 *
 * Reads your scheduler's data (the "tutorwise-os" Firebase project behind schedule.tutorwise.ca)
 * as you, READ-ONLY, and copies it into one Google Sheet that your planner reads.
 * It never changes anything in the scheduler.
 *
 * To link: choose "setup" in the function menu above and press Run. Allow access when asked.
 * After that it refreshes by itself every hour.
 */
var PROJECT_ID = 'tutorwise-os';
var SHEET_TITLE = 'TutorWise Scheduler Export';
var WEEKS_BACK = 16;
var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** Run this once. */
function setup() {
  var ss = sheet_();
  exportNow();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'exportNow') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('exportNow').timeBased().everyHours(1).create();
  Logger.log('Linked. Your sheet: ' + ss.getUrl());
}

/** Copies the scheduler into the sheet. Runs every hour once setup() has been run. */
function exportNow() {
  var ss = sheet_(), started = new Date().toISOString();
  try {
    var data = load_();
    var tabs = build_(data.cfg, data.weeks);
    write_(ss, tabs);
    meta_(ss, [['Status', 'ok'], ['Exported at', started], ['Signed in as', data.auth],
      ['Scheduler last changed', data.cfg.updatedAt || ''], ['Weeks in scheduler', Object.keys(data.weeks).length],
      ['This week starts', mondayKey_()], ['Students', tabs.Students.length - 1], ['Sessions exported', tabs.Sessions.length - 1]]);
  } catch (e) {
    meta_(ss, [['Status', 'error'], ['Exported at', started], ['Error', String((e && e.message) || e).slice(0, 1500)]]);
    throw e;
  }
}

/* ---------- reading the scheduler ---------- */
function load_() {
  var auth = token_();
  var cfg = dec_({mapValue: get_('schedulerConfig/main', auth)});
  var weeks = {}, tok = '';
  do {
    var page = get_('schedulerWeeks?pageSize=40' + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''), auth);
    (page.documents || []).forEach(function (d) { weeks[d.name.split('/').pop()] = dec_({mapValue: d}); });
    tok = page.nextPageToken || '';
  } while (tok);
  return {cfg: cfg, weeks: weeks, auth: auth.mode};
}
function token_() {
  var key = PropertiesService.getScriptProperties().getProperty('SA_KEY');
  if (key) return {mode: 'service account', token: saToken_(JSON.parse(key))};
  return {mode: 'your Google account', token: ScriptApp.getOAuthToken()};
}
function get_(path, auth, quota) {
  var headers = {Authorization: 'Bearer ' + auth.token};
  if (quota) headers['X-Goog-User-Project'] = PROJECT_ID;
  var res = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + path,
    {headers: headers, muteHttpExceptions: true});
  var code = res.getResponseCode(), body = res.getContentText();
  if (code === 403 && !quota && auth.mode !== 'service account' && /has not been used|is disabled|SERVICE_DISABLED|quota project/i.test(body)) return get_(path, auth, true);
  if (code !== 200) throw new Error('Could not read the scheduler (' + code + ') at ' + path.split('?')[0] + ': ' + body.slice(0, 700));
  return JSON.parse(body);
}
function saToken_(k) {
  var now = Math.floor(Date.now() / 1000);
  var enc = function (o) { return Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, ''); };
  var unsigned = enc({alg: 'RS256', typ: 'JWT'}) + '.' + enc({iss: k.client_email, scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000});
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(unsigned, k.private_key)).replace(/=+$/, '');
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {method: 'post', muteHttpExceptions: true,
    payload: {grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + sig}});
  var j = JSON.parse(res.getContentText());
  if (!j.access_token) throw new Error('Service account sign-in failed: ' + res.getContentText().slice(0, 300));
  return j.access_token;
}
/** Firestore's typed JSON -> plain values. */
function dec_(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec_);
  if ('mapValue' in v) {
    var o = {}, f = v.mapValue.fields || {};
    Object.keys(f).forEach(function (k) { o[k] = dec_(f[k]); });
    return o;
  }
  return null;
}

/* ---------- shaping it into tables ---------- */
function build_(cfg, weeks) {
  var teachers = cfg.teachers || [], tName = {};
  teachers.forEach(function (t) { tName[t.id] = t.name || t.id; });
  var profiles = cfg.studentProfiles || {}, active = cfg.students || [], inactive = cfg.inactiveStudents || [];
  var keys = Object.keys(weeks).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }).sort();
  var cutoff = addDays_(mondayKey_(), -7 * WEEKS_BACK), out = {};

  out.Students = [['Student', 'Active', 'Lessons per week', 'Weight', 'Makeup balance (h)', 'Credits earned (h)', 'Credits used (h)']];
  active.concat(inactive.filter(function (n) { return active.indexOf(n) < 0; })).forEach(function (n) {
    var p = profiles[n] || {}, m = makeup_(n, p, weeks);
    out.Students.push([n, active.indexOf(n) >= 0 ? 'yes' : 'no', p.lessonsPerWeek == null ? '' : p.lessonsPerWeek, p.weight == null ? '' : p.weight,
      p.makeupOffset || 0, m.given, m.used]);
  });

  out.Timetable = [['Student', 'Day', 'Start', 'End', 'Teacher']];
  each_(cfg.defaultSchedule || {}, function (tid, day, s) {
    out.Timetable.push([s.student, day, clock_(s.start), clock_(s.end), tName[tid] || tid]);
  });

  out.Sessions = [['Week of', 'Date', 'Day', 'Student', 'Teacher', 'Start', 'End', 'Hours', 'Status', 'Billing month']];
  keys.forEach(function (k) {
    if (k < cutoff) return;
    var w = weeks[k] || {}, hol = w.holidays || [], rm = billMonth_(k, w);
    each_(w.schedule || {}, function (tid, day, s) {
      var status = hol.indexOf(day) >= 0 ? 'holiday' : (s.attended == null ? '' : String(s.attended));
      out.Sessions.push([k, addDays_(k, DAYS.indexOf(day)), day, s.student, tName[tid] || tid, clock_(s.start), clock_(s.end),
        Math.round((s.end - s.start) / 60 * 100) / 100, status, rm]);
    });
  });

  out.Teachers = [['Id', 'Name', 'Capacity']].concat(teachers.map(function (t) { return [t.id, t.name || '', t.capacity == null ? '' : t.capacity]; }));
  return out;
}
/** Every real student session in a schedule, in teacher / weekday / time order. Prep blocks are skipped. */
function each_(sched, fn) {
  Object.keys(sched).sort().forEach(function (tid) {
    DAYS.forEach(function (day) {
      ((sched[tid] || {})[day] || []).slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (s) {
        if (s && s.student && !s.isAdmin && typeof s.start === 'number' && typeof s.end === 'number') fn(tid, day, s);
      });
    });
  });
}
/** Same arithmetic the scheduler uses for makeup credits (earned on "missed, credit" weeks, used on extra attended hours). */
function makeup_(name, prof, weeks) {
  var lpw = prof.lessonsPerWeek || 0, given = 0, used = 0;
  Object.keys(weeks).forEach(function (k) {
    var sch = 0, att = 0, yel = 0, cnt = 0;
    each_((weeks[k] || {}).schedule || {}, function (tid, day, s) {
      if (s.student !== name) return;
      var h = (s.end - s.start) / 60; sch += h; cnt++;
      if (s.attended === 'attended') att += h;
      if (s.attended === 'missed_credit') yel += h;
    });
    if (!cnt) return;
    var normal = lpw > 0 ? lpw * (sch / cnt) : sch;
    given += Math.min(Math.max(0, normal - att), yel);
    used += Math.max(0, att - normal);
  });
  return {given: Math.round(given * 100) / 100, used: Math.round(used * 100) / 100};
}
/** The month a week is billed to: the scheduler's manual choice, otherwise the month its Wednesday falls in. */
function billMonth_(key, w) {
  var rm = w && w.reportingMonth;
  if (rm && typeof rm.year === 'number' && typeof rm.month === 'number') return rm.year + '-' + ('0' + (rm.month + 1)).slice(-2);
  return addDays_(key, 2).slice(0, 7);
}
/** Scheduler times are minutes after noon. */
function clock_(m) {
  var t = 720 + m;
  return ('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + (t % 60)).slice(-2);
}
function addDays_(key, n) {
  var p = key.split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10);
}
function mondayKey_() {
  var now = new Date(), today = Utilities.formatDate(now, 'America/Toronto', 'yyyy-MM-dd'), dow = +Utilities.formatDate(now, 'America/Toronto', 'u');
  return addDays_(today, 1 - dow);
}

/* ---------- writing the sheet ---------- */
function sheet_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  var ss = SpreadsheetApp.create(SHEET_TITLE);
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}
function tab_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
function fill_(ss, name, rows) {
  var sh = tab_(ss, name);
  sh.clearContents();
  sh.getRange(1, 1, rows.length, rows[0].length).setNumberFormat('@').setValues(rows.map(function (r) { return r.map(String); }));
  sh.setFrozenRows(1);
}
function write_(ss, tabs) {
  ['Students', 'Timetable', 'Sessions', 'Teachers'].forEach(function (n) { fill_(ss, n, tabs[n]); });
}
function meta_(ss, rows) {
  var sh = tab_(ss, 'Meta');
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 2).setNumberFormat('@').setValues(rows.map(function (r) { return [String(r[0]), String(r[1])]; }));
  var first = ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
}
