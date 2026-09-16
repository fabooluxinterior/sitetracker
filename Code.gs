const CONFIG = {
  spreadsheetId: '1cq5aTDi7W8FUs3WWmi46Sjk0rxZmaudclt3x8u29Idc',
  visitsSheet: 'Visits',
  sitesSheet: 'Sites',
  usersSheet: 'Users',
  timezone: 'Asia/Kolkata',
  maxDays: 15,
  sessionSeconds: 21600,
  driveFolder: 'SiteTrack V2 Selfies',
  exportFolder: 'SiteTrack Admin Exports'
};

const VISIT_HEADERS = ['Session ID','Status','Coordinator Email','Coordinator Name','Site Name','Site Location','Workers','Working Day','Total Days','Login At','Login Date','Login Location','Login Latitude','Login Longitude','Login Selfie URL','Logout At','Logout Date','Logout Location','Logout Latitude','Logout Longitude','Logout Selfie URL','Logout Comment','Server Timezone','Created At','Updated At'];
const SITE_HEADERS = ['Site Key','Site Name','Site Location','Last Visit Date','Last Coordinator','Total Visits'];
const USER_HEADERS = ['Email','Password','Role','Display Name','Active','Updated At'];

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = p.action || 'health';
    if (action === 'health') return json_({ok:true, service:'SiteTrack', version:'v2'});
    if (action === 'active') return json_({ok:true, active:activeSessions_(requireAuth_(p.token))});
    if (action === 'days_used') return json_({ok:true, days:daysUsed_(requireAuth_(p.token), p.siteKey || '')});
    if (action === 'admin_data') return json_({ok:true, data:adminData_(requireAdmin_(p.token), p)});
    if (action === 'admin_users') return json_({ok:true, users:adminUsers_(requireAdmin_(p.token))});
    if (action === 'admin_export') return json_({ok:true, downloadUrl:adminExport_(requireAdmin_(p.token), p)});
    return json_({ok:false,error:'Unknown action'});
  } catch (err) {
    return json_({ok:false,error:String(err.message || err)});
  }
}

function doPost(e) {
  try {
    const p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (p.action === 'login') return json_(login_(p));
    if (p.action === 'site_login') return json_(siteLogin_(p));
    if (p.action === 'site_logout') return json_(siteLogout_(p));
    if (p.action === 'admin_save_user') return json_(adminSaveUser_(p));
    return json_({ok:false,error:'Unknown action'});
  } catch (err) {
    return json_({ok:false,error:String(err.message || err)});
  }
}

function setup() {
  const ss = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const visits = ensureSheet_(ss, CONFIG.visitsSheet, VISIT_HEADERS);
  const sites = ensureSheet_(ss, CONFIG.sitesSheet, SITE_HEADERS);
  const users = ensureSheet_(ss, CONFIG.usersSheet, USER_HEADERS);
  styleSheet_(visits, VISIT_HEADERS.length);
  styleSheet_(sites, SITE_HEADERS.length);
  styleSheet_(users, USER_HEADERS.length);
  return 'SiteTrack v2 database ready';
}

function login_(p) {
  const email = normalizeEmail_(p.email);
  const password = String(p.password || '');
  if (!email || !password) throw new Error('Email and password are required.');
  const rows = dataRows_(sheet_(CONFIG.usersSheet));
  const row = rows.find(r => normalizeEmail_(r[0]) === email);
  if (!row || !isTruthy_(row[4]) || String(row[1] || '') !== password) throw new Error('Invalid email or password.');
  const user = {email:email, name:String(row[3] || email), role:String(row[2] || 'coordinator').toLowerCase()};
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('auth:' + token, JSON.stringify(user), CONFIG.sessionSeconds);
  return {ok:true, token:token, user:user, active:activeSessions_(user), serverNow:new Date().toISOString(), timezone:CONFIG.timezone};
}

function siteLogin_(p) {
  const user = requireAuth_(p.token);
  requireLocationAndSelfie_(p, 'login');
  const name = String(p.siteName || '').trim();
  const location = String(p.siteLocation || '').trim();
  const workers = Number(p.workers);
  if (!name || !location) throw new Error('Site name and site location are required.');
  if (!isFinite(workers) || workers < 0) throw new Error('Enter a valid number of workers.');
  const siteKey = key_(name, location);
  const visits = sheet_(CONFIG.visitsSheet);
  const rows = dataRows_(visits);
  if (rows.some(r => String(r[1]) === 'ACTIVE' && String(r[2]) === user.email && String(r[4]) + '|' + String(r[5]) === siteKey)) throw new Error('This site is already active. Use site logout before logging in again.');
  const now = new Date();
  const loginDate = dateKey_(now);
  const siteDates = uniqueDates_(rows.filter(r => String(r[2]) === user.email && String(r[4]) + '|' + String(r[5]) === siteKey).map(r => String(r[10] || '')));
  const workingDay = siteDates.indexOf(loginDate) >= 0 ? siteDates.length : siteDates.length + 1;
  if (workingDay > CONFIG.maxDays) throw new Error('This site has reached the 15-working-day limit.');
  const sessionId = Utilities.getUuid();
  const selfieUrl = saveImage_(p.loginSelfieDataUrl, 'login_' + sessionId);
  const row = [sessionId,'ACTIVE',user.email,user.name,name,location,workers,workingDay,CONFIG.maxDays,now,loginDate,String(p.locationName),Number(p.latitude),Number(p.longitude),selfieUrl,'','','','','','','',CONFIG.timezone,now,now];
  visits.appendRow(row);
  upsertSite_(name, location, loginDate, user.email);
  return {ok:true,session:visitObject_(row),active:activeSessions_(user),serverNow:now.toISOString(),timezone:CONFIG.timezone};
}

function siteLogout_(p) {
  const user = requireAuth_(p.token);
  requireLocationAndSelfie_(p, 'logout');
  const sessionId = String(p.sessionId || '');
  if (!sessionId) throw new Error('Select an active site.');
  const visits = sheet_(CONFIG.visitsSheet);
  const rows = dataRows_(visits);
  const i = rows.findIndex(r => String(r[0]) === sessionId && String(r[1]) === 'ACTIVE' && (String(r[2]) === user.email || user.role === 'admin'));
  if (i < 0) throw new Error('Active site session not found.');
  const now = new Date();
  const row = rows[i].slice();
  row[1] = 'COMPLETED'; row[15] = now; row[16] = dateKey_(now); row[17] = String(p.locationName); row[18] = Number(p.latitude); row[19] = Number(p.longitude); row[20] = saveImage_(p.logoutSelfieDataUrl, 'logout_' + sessionId); row[21] = String(p.logoutComment || '').trim(); row[24] = now;
  visits.getRange(i + 2, 1, 1, VISIT_HEADERS.length).setValues([row]);
  return {ok:true,session:visitObject_(row),active:activeSessions_(user),serverNow:now.toISOString(),timezone:CONFIG.timezone};
}

function activeSessions_(user) {
  return dataRows_(sheet_(CONFIG.visitsSheet)).filter(r => String(r[1]) === 'ACTIVE' && (user.role === 'admin' || String(r[2]) === user.email)).map(visitObject_).sort((a,b) => String(b.loginAt).localeCompare(String(a.loginAt)));
}

function daysUsed_(user, siteKey) {
  if (!siteKey) return [];
  const dates = dataRows_(sheet_(CONFIG.visitsSheet)).filter(r => String(r[2]) === user.email && String(r[4]) + '|' + String(r[5]) === String(siteKey)).map(r => String(r[10] || ''));
  return uniqueDates_(dates).slice(-CONFIG.maxDays);
}

function adminData_(admin, p) {
  const q = String(p.q || '').toLowerCase();
  const coordinator = String(p.coordinator || '').toLowerCase();
  const from = p.from ? new Date(p.from + 'T00:00:00') : null;
  const to = p.to ? new Date(p.to + 'T23:59:59') : null;
  const sort = String(p.sort || 'newest');
  let visits = dataRows_(sheet_(CONFIG.visitsSheet)).map(visitObject_).filter(v => {
    const text = (v.siteName + ' ' + v.siteLocation).toLowerCase();
    const coord = (v.coordinatorEmail + ' ' + v.coordinatorName).toLowerCase();
    const d = new Date(v.loginAt);
    return (!q || text.indexOf(q) >= 0) && (!coordinator || coord.indexOf(coordinator) >= 0) && (!from || d >= from) && (!to || d <= to);
  });
  visits.sort((a,b) => sort === 'oldest' ? a.loginAt.localeCompare(b.loginAt) : sort === 'site' ? a.siteName.localeCompare(b.siteName) : sort === 'coordinator' ? a.coordinatorName.localeCompare(b.coordinatorName) : b.loginAt.localeCompare(a.loginAt));
  return {visits:visits.slice(0,1000),active:visits.filter(v => v.status === 'ACTIVE'),total:visits.length};
}

function adminExport_(admin, p) {
  const result = adminData_(admin, p);
  const stamp = Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyyMMdd_HHmmss');
  const exportFolder = folderByName_(CONFIG.exportFolder);
  const blobs = [];
  const rows = [VISIT_HEADERS].concat(result.visits.map(exportRow_));
  blobs.push(Utilities.newBlob(rows.map(csvRow_).join('\\r\\n'), 'text/csv', 'visits.csv'));
  result.visits.forEach((v, index) => {
    [['login', v.loginSelfieUrl], ['logout', v.logoutSelfieUrl]].forEach(pair => {
      const id = extractDriveId_(pair[1]);
      if (!id) return;
      try {
        const source = DriveApp.getFileById(id);
        const ext = (source.getName().split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
        const fileName = 'selfies/' + String(index + 1).padStart(4, '0') + '_' + pair[0] + '_' + safeFileName_(v.siteName) + '.' + ext;
        blobs.push(source.getBlob().setName(fileName));
      } catch (e) {}
    });
  });
  const zip = exportFolder.createFile(Utilities.zip(blobs, 'sitetrack_export_' + stamp + '.zip'));
  adminUsers_(admin).filter(u => u.active && u.role === 'admin').forEach(u => {
    try { zip.addViewer(u.email); } catch (e) {}
  });
  return zip.getUrl();
}

function exportRow_(v) {
  return [v.sessionId,v.status,v.coordinatorEmail,v.coordinatorName,v.siteName,v.siteLocation,v.workers,v.workingDay,v.totalDays,v.loginAt,v.loginDate,v.loginLocation,v.loginLatitude,v.loginLongitude,v.loginSelfieUrl,v.logoutAt,v.logoutDate,v.logoutLocation,v.logoutLatitude,v.logoutLongitude,v.logoutSelfieUrl,v.logoutComment,v.timezone,v.createdAt,v.updatedAt];
}
function csvRow_(row) { return row.map(v => '\"' + String(v === undefined || v === null ? '' : v).replace(/\"/g, '\"\"') + '\"').join(','); }
function extractDriveId_(url) { const m = String(url || '').match(/[a-zA-Z0-9_-]{25,}/); return m ? m[0] : ''; }
function safeFileName_(name) { return String(name || 'site').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80) || 'site'; }
function folderByName_(name) { const it = DriveApp.getFoldersByName(name); return it.hasNext() ? it.next() : DriveApp.createFolder(name); }

function adminUsers_(admin) {
  return dataRows_(sheet_(CONFIG.usersSheet)).map(r => ({email:normalizeEmail_(r[0]),name:String(r[3] || r[0] || ''),role:String(r[2] || 'coordinator').toLowerCase(),active:isTruthy_(r[4]),updatedAt:dateIso_(r[5])}));
}

function adminSaveUser_(p) {
  const admin = requireAdmin_(p.token);
  const email = normalizeEmail_(p.email);
  if (!email) throw new Error('Email is required.');
  const users = sheet_(CONFIG.usersSheet);
  const rows = dataRows_(users);
  const i = rows.findIndex(r => normalizeEmail_(r[0]) === email);
  const old = i >= 0 ? rows[i] : [];
  if (i < 0 && !String(p.password || '')) throw new Error('Password is required for a new user.');
  const role = String(p.role || 'coordinator').toLowerCase() === 'admin' ? 'admin' : 'coordinator';
  if (email === admin.email && role !== 'admin') throw new Error('You cannot remove your own admin access.');
  const row = [email,String(p.password || old[1] || ''),role,String(p.name || email),p.active === undefined ? (i < 0 ? true : isTruthy_(old[4])) : isTruthy_(p.active),new Date()];
  if (i < 0) users.appendRow(row); else users.getRange(i + 2, 1, 1, USER_HEADERS.length).setValues([row]);
  return {ok:true};
}

function upsertSite_(name, location, date, email) {
  const sites = sheet_(CONFIG.sitesSheet); const rows = dataRows_(sites); const k = key_(name, location); const i = rows.findIndex(r => String(r[0]) === k);
  if (i < 0) sites.appendRow([k,name,location,date,email,1]);
  else sites.getRange(i + 2, 2, 1, 5).setValues([[name,location,date,email,Number(rows[i][5] || 0) + 1]]);
}

function visitObject_(r) { return {sessionId:String(r[0] || ''),status:String(r[1] || ''),coordinatorEmail:String(r[2] || ''),coordinatorName:String(r[3] || ''),siteName:String(r[4] || ''),siteLocation:String(r[5] || ''),workers:Number(r[6] || 0),workingDay:Number(r[7] || 0),totalDays:Number(r[8] || CONFIG.maxDays),loginAt:dateIso_(r[9]),loginDate:String(r[10] || ''),loginLocation:String(r[11] || ''),loginLatitude:r[12] === '' ? '' : Number(r[12]),loginLongitude:r[13] === '' ? '' : Number(r[13]),loginSelfieUrl:String(r[14] || ''),logoutAt:dateIso_(r[15]),logoutDate:String(r[16] || ''),logoutLocation:String(r[17] || ''),logoutLatitude:r[18] === '' ? '' : Number(r[18]),logoutLongitude:r[19] === '' ? '' : Number(r[19]),logoutSelfieUrl:String(r[20] || ''),logoutComment:String(r[21] || ''),timezone:String(r[22] || CONFIG.timezone),createdAt:dateIso_(r[23]),updatedAt:dateIso_(r[24])}; }
function requireAuth_(token) { const raw = token && CacheService.getScriptCache().get('auth:' + token); if (!raw) throw new Error('Session expired. Please sign in again.'); return JSON.parse(raw); }
function requireAdmin_(token) { const u = requireAuth_(token); if (u.role !== 'admin') throw new Error('Admin access required.'); return u; }
function requireLocationAndSelfie_(p, kind) { if (!p.locationName || p.latitude === undefined || p.longitude === undefined || p.latitude === '' || p.longitude === '' || !isFinite(Number(p.latitude)) || !isFinite(Number(p.longitude))) throw new Error('Location access is required.'); if (!p[kind + 'SelfieDataUrl']) throw new Error('Camera access and a selfie are required.'); }
function sheet_(name) { return ensureSheet_(SpreadsheetApp.openById(CONFIG.spreadsheetId), name, name === CONFIG.visitsSheet ? VISIT_HEADERS : name === CONFIG.sitesSheet ? SITE_HEADERS : USER_HEADERS); }
function ensureSheet_(ss, name, headers) { let s = ss.getSheetByName(name); if (!s) s = ss.insertSheet(name); if (s.getLastRow() === 0) s.getRange(1,1,1,headers.length).setValues([headers]); return s; }
function dataRows_(s) { const n = s.getLastRow(); if (n < 2) return []; return s.getRange(2,1,n - 1,Math.max(s.getLastColumn(),1)).getValues(); }
function styleSheet_(s, cols) { s.setFrozenRows(1); const h=s.getRange(1,1,1,cols); h.setBackground('#f97316').setFontColor('#ffffff').setFontWeight('bold').setWrap(true); for (let i=1;i<=cols;i++) s.setColumnWidth(i, i===5||i===6||i===12||i===18||i===22?190:135); }
function saveImage_(dataUrl, name) { const m=String(dataUrl || '').match(/^data:(image\/[\w.+-]+);base64,(.+)$/); if(!m) throw new Error('Invalid selfie image.'); const it=DriveApp.getFoldersByName(CONFIG.driveFolder); const folder=it.hasNext()?it.next():DriveApp.createFolder(CONFIG.driveFolder); return folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]),m[1],name+'.jpg')).getUrl(); }
function key_(name, location) { return String(name).trim() + '|' + String(location).trim(); }
function uniqueDates_(a) { return [...new Set(a.filter(Boolean))].sort(); }
function dateKey_(d) { return Utilities.formatDate(d, CONFIG.timezone, 'yyyy-MM-dd'); }
function dateIso_(v) { if(!v) return ''; const d=new Date(v); return isNaN(d.getTime())?String(v):d.toISOString(); }
function normalizeEmail_(v) { return String(v || '').trim().toLowerCase(); }
function isTruthy_(v) { return v===true || ['true','1','yes'].indexOf(String(v).toLowerCase())>=0; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
