/** SiteTrack backend — login, site sessions, admin dashboard, and Google Sheets storage.
 *  The Credentials tab is the source of truth for email/password/role access.
 *  Run setup() once after updating this script, then deploy as a Web app.
 */
const CONFIG = {
  visitsSheet: 'Visits',
  customersSheet: 'Customers',
  credentialsSheet: 'Credentials',
  driveFolder: 'SiteTrack Uploads',
  timezone: Session.getScriptTimeZone() || 'Asia/Kolkata',
  maxDays: 15,
  sessionSeconds: 21600
};

const VISIT_HEADERS = ['Session ID','Status','Coordinator Email','Coordinator Name','Customer ID','Client Name','Site Location','Workers','Working Day','Total Days','Login At','Login Date','Login Location','Login Latitude','Login Longitude','Login Selfie URL','Logout At','Logout Date','Logout Location','Logout Latitude','Logout Longitude','Logout Selfie URL'];
const CUSTOMER_HEADERS = ['Customer ID','Client Name','Site Location','Last Visit At','Last Coordinator Email','Total Visits'];
const CREDENTIAL_HEADERS = ['Email','Password','Role','Display Name','Active','Updated At'];

function setup() {
  const ss = SpreadsheetApp.getActive();
  const visits = ensureSheet_(ss, CONFIG.visitsSheet, VISIT_HEADERS);
  const customers = ensureSheet_(ss, CONFIG.customersSheet, CUSTOMER_HEADERS);
  const credentials = ensureSheet_(ss, CONFIG.credentialsSheet, CREDENTIAL_HEADERS);
  styleSheet_(visits, VISIT_HEADERS.length);
  styleSheet_(customers, CUSTOMER_HEADERS.length);
  styleSheet_(credentials, CREDENTIAL_HEADERS.length);
  visits.setFrozenRows(1); customers.setFrozenRows(1); credentials.setFrozenRows(1);
  visits.getRange('K:K').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  visits.getRange('Q:Q').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  customers.getRange('D:D').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  credentials.getRange('F:F').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  const seeded = seedAdmin_(credentials);
  return seeded ? 'SiteTrack ready. An initial admin account was added to Credentials; change its password immediately.' : 'SiteTrack ready. Existing credentials were preserved.';
}

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = p.action || 'health';
    if (action === 'health') return json_({ok:true, service:'SiteTrack', version:'3'});
    if (action === 'active') return json_({ok:true, active: activeSessions_(requireAuth_(p.token))});
    if (action === 'customers') return json_({ok:true, customers: recentCustomers_(requireAuth_(p.token))});
    if (action === 'search') return json_({ok:true, customers: searchCustomers_(requireAuth_(p.token), p.q || '')});
    if (action === 'days_used') return json_({ok:true, days: daysUsed_(requireAuth_(p.token), p.customerId || '')});
    if (action === 'admin_data') return json_({ok:true, data: adminData_(requireAdmin_(p.token), p)});
    if (action === 'admin_users') return json_({ok:true, users: adminUsers_(requireAdmin_(p.token))});
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
    if (p.action === 'logout') return json_(logout_(p));
    if (p.action === 'admin_save_user') return json_(adminSaveUser_(p));
    return json_({ok:false,error:'Unknown action'});
  } catch (err) {
    return json_({ok:false,error:String(err.message || err)});
  }
}

function login_(p) {
  const email = normalizeEmail_(p.email);
  const password = String(p.password || '');
  if (!email || !password) throw new Error('Email and password are required.');
  const sheet = ensureSheet_(SpreadsheetApp.getActive(), CONFIG.credentialsSheet, CREDENTIAL_HEADERS);
  const rows = dataRows_(sheet);
  const row = rows.find(r => normalizeEmail_(r[0]) === email);
  if (!row || !isTruthy_(row[4]) || String(row[1] || '') !== password) throw new Error('Invalid email or password.');
  const user = {email:email, name:String(row[3] || email), role:String(row[2] || 'coordinator').toLowerCase(), coordinatorId:email};
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('auth:' + token, JSON.stringify(user), CONFIG.sessionSeconds);
  return {ok:true, token:token, user:user, active:activeSessions_(user)};
}

function siteLogin_(p) {
  const user = requireAuth_(p.token);
  requireLocation_(p);
  if (!p.customerId || !p.clientName || !p.siteLocation) throw new Error('Client and site are required.');
  if (!p.loginSelfieDataUrl) throw new Error('A login selfie is required.');
  const ss = SpreadsheetApp.getActive();
  const visits = ensureSheet_(ss, CONFIG.visitsSheet, VISIT_HEADERS);
  const rows = dataRows_(visits);
  const duplicate = rows.find(r => String(r[2]) === user.email && String(r[4]) === String(p.customerId) && String(r[1]) === 'ACTIVE');
  if (duplicate) throw new Error('This site is already active. Log out before starting it again.');
  const now = new Date();
  const loginDate = formatDate_(now);
  const daySet = {};
  rows.forEach(r => { if (String(r[2]) === user.email && String(r[4]) === String(p.customerId) && r[11]) daySet[String(r[11])] = true; });
  const workingDay = Object.keys(daySet).length + 1;
  if (workingDay > CONFIG.maxDays) throw new Error('This site has reached the 15-day limit for this coordinator.');
  const folder = getOrCreateFolder_(CONFIG.driveFolder);
  const sessionId = Utilities.getUuid();
  const loginSelfieUrl = saveImage_(folder, p.loginSelfieDataUrl, 'login_' + sessionId);
  const rowValues = [sessionId,'ACTIVE',user.email,user.name,String(p.customerId),String(p.clientName),String(p.siteLocation),Number(p.workers || 0),workingDay,CONFIG.maxDays,now,loginDate,String(p.locationName || ''),Number(p.latitude),Number(p.longitude),loginSelfieUrl,'','','','','',''];
  visits.appendRow(rowValues);
  upsertCustomer_(ss, p, now, user.email);
  return {ok:true, session:visitObject_(rowValues), active:activeSessions_(user)};
}

function siteLogout_(p) {
  const user = requireAuth_(p.token);
  requireLocation_(p);
  if (!p.sessionId || !p.logoutSelfieDataUrl) throw new Error('A logout selfie and active session are required.');
  const visits = ensureSheet_(SpreadsheetApp.getActive(), CONFIG.visitsSheet, VISIT_HEADERS);
  const rows = dataRows_(visits);
  const index = rows.findIndex(r => String(r[0]) === String(p.sessionId) && String(r[2]) === user.email && String(r[1]) === 'ACTIVE');
  if (index < 0) throw new Error('Active site session not found.');
  const now = new Date();
  const folder = getOrCreateFolder_(CONFIG.driveFolder);
  const logoutUrl = saveImage_(folder, p.logoutSelfieDataUrl, 'logout_' + p.sessionId);
  const rowNumber = index + 2;
  const row = rows[index].slice();
  row[1] = 'COMPLETED'; row[16] = now; row[17] = formatDate_(now); row[18] = String(p.locationName || ''); row[19] = Number(p.latitude); row[20] = Number(p.longitude); row[21] = logoutUrl;
  visits.getRange(rowNumber, 1, 1, VISIT_HEADERS.length).setValues([row]);
  return {ok:true, session:visitObject_(row), active:activeSessions_(user)};
}

function logout_(p) { return siteLogout_(p); }

function activeSessions_(user) {
  const sheet = ensureSheet_(SpreadsheetApp.getActive(), CONFIG.visitsSheet, VISIT_HEADERS);
  return dataRows_(sheet).filter(r => String(r[1]) === 'ACTIVE' && (user.role === 'admin' || String(r[2]) === user.email)).map(visitObject_).sort((a,b) => String(a.loginAt).localeCompare(String(b.loginAt)));
}

function recentCustomers_(user) {
  const sheet = ensureSheet_(SpreadsheetApp.getActive(), CONFIG.customersSheet, CUSTOMER_HEADERS);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return dataRows_(sheet).filter(r => new Date(r[3]).getTime() >= cutoff).map(customerObject_).sort((a,b) => String(b.lastVisit).localeCompare(String(a.lastVisit)));
}

function searchCustomers_(user, q) {
  const needle = String(q || '').toLowerCase();
  if (!needle) return [];
  const sheet = ensureSheet_(SpreadsheetApp.getActive(), CONFIG.customersSheet, CUSTOMER_HEADERS);
  return dataRows_(sheet).map(customerObject_).filter(c => (c.name + ' ' + c.location).toLowerCase().indexOf(needle) >= 0).slice(0,100);
}

function daysUsed_(user, customerId) {
  const sheet = ensureSheet_(SpreadsheetApp.getActive(), CONFIG.visitsSheet, VISIT_HEADERS);
  const days = {};
  dataRows_(sheet).forEach(r => { if (String(r[2]) === user.email && String(r[4]) === String(customerId) && r[11]) days[String(r[11])] = true; });
  return Object.keys(days).sort().slice(-CONFIG.maxDays);
}

function adminData_(user, p) {
  const sheet = ensureSheet_(SpreadsheetApp.getActive(), CONFIG.visitsSheet, VISIT_HEADERS);
  const q = String(p.q || '').toLowerCase();
  const coordinator = String(p.coordinator || '').toLowerCase();
  const from = p.from ? new Date(p.from + 'T00:00:00') : null;
  const to = p.to ? new Date(p.to + 'T23:59:59') : null;
  const visits = dataRows_(sheet).map(visitObject_).filter(v => {
    const searchable = (v.clientName + ' ' + v.siteLocation).toLowerCase();
    const coordinatorMatch = !coordinator || (v.coordinatorEmail + ' ' + v.coordinatorName).toLowerCase().indexOf(coordinator) >= 0;
    const queryMatch = !q || searchable.indexOf(q) >= 0;
    const d = new Date(v.loginAt);
    return coordinatorMatch && queryMatch && (!from || d >= from) && (!to || d <= to);
  }).sort((a,b) => String(b.loginAt).localeCompare(String(a.loginAt)));
  const active = visits.filter(v => v.status === 'ACTIVE');
  const coordinators = [...new Set(visits.map(v => v.coordinatorEmail).filter(Boolean))].sort();
  return {visits:visits.slice(0,500),active:active,coordinators:coordinators,total:visits.length};
}

function adminUsers_(user) {
  const sheet = ensureSheet_(SpreadsheetApp.getActive(), CONFIG.credentialsSheet, CREDENTIAL_HEADERS);
  return dataRows_(sheet).map(r => ({email:normalizeEmail_(r[0]),password:'',role:String(r[2] || 'coordinator').toLowerCase(),name:String(r[3] || r[0] || ''),active:isTruthy_(r[4]),updatedAt:dateIso_(r[5])}));
}

function adminSaveUser_(p) {
  const admin = requireAdmin_(p.token);
  const email = normalizeEmail_(p.email);
  if (!email) throw new Error('Email is required.');
  const role = String(p.role || 'coordinator').toLowerCase() === 'admin' ? 'admin' : 'coordinator';
  const sheet = ensureSheet_(SpreadsheetApp.getActive(), CONFIG.credentialsSheet, CREDENTIAL_HEADERS);
  const rows = dataRows_(sheet);
  const index = rows.findIndex(r => normalizeEmail_(r[0]) === email);
  if (index < 0 && !String(p.password || '')) throw new Error('Password is required for a new user.');
  if (index >= 0 && email === admin.email && role !== 'admin') throw new Error('You cannot remove your own admin access.');
  const old = index >= 0 ? rows[index] : [];
  const row = [email,String(p.password || old[1] || ''),role,String(p.name || email),isTruthy_(p.active === undefined ? (old[4] === undefined ? true : old[4]) : p.active),new Date()];
  if (index < 0) sheet.appendRow(row); else sheet.getRange(index + 2,1,1,CREDENTIAL_HEADERS.length).setValues([row]);
  return {ok:true};
}

function upsertCustomer_(ss, p, now, email) {
  const sheet = ensureSheet_(ss, CONFIG.customersSheet, CUSTOMER_HEADERS);
  const id = String(p.customerId || (p.clientName + '|' + p.siteLocation));
  const rows = dataRows_(sheet); const index = rows.findIndex(r => String(r[0]) === id);
  if (index < 0) sheet.appendRow([id,p.clientName || '',p.siteLocation || '',now,email,1]);
  else sheet.getRange(index + 2, 2, 1, 5).setValues([[p.clientName || '',p.siteLocation || '',now,email,Number(rows[index][5] || 0) + 1]]);
}

function visitObject_(r) { return {sessionId:String(r[0] || ''),status:String(r[1] || ''),coordinatorEmail:String(r[2] || ''),coordinatorName:String(r[3] || ''),customerId:String(r[4] || ''),clientName:String(r[5] || ''),siteLocation:String(r[6] || ''),workers:Number(r[7] || 0),workingDay:Number(r[8] || 0),totalDays:Number(r[9] || CONFIG.maxDays),loginAt:dateIso_(r[10]),loginDate:String(r[11] || ''),loginLocation:String(r[12] || ''),loginLatitude:r[13] === '' ? '' : Number(r[13]),loginLongitude:r[14] === '' ? '' : Number(r[14]),loginSelfieUrl:String(r[15] || ''),logoutAt:dateIso_(r[16]),logoutDate:String(r[17] || ''),logoutLocation:String(r[18] || ''),logoutLatitude:r[19] === '' ? '' : Number(r[19]),logoutLongitude:r[20] === '' ? '' : Number(r[20]),logoutSelfieUrl:String(r[21] || '')}; }
function customerObject_(r) { return {customerId:String(r[0] || ''),name:String(r[1] || ''),location:String(r[2] || ''),lastVisit:dateIso_(r[3]),coordinatorEmail:String(r[4] || ''),totalVisits:Number(r[5] || 0)}; }
function requireAuth_(token) { const raw = token && CacheService.getScriptCache().get('auth:' + token); if (!raw) throw new Error('Session expired. Please sign in again.'); return JSON.parse(raw); }
function requireAdmin_(token) { const user = requireAuth_(token); if (user.role !== 'admin') throw new Error('Admin access required.'); return user; }
function requireLocation_(p) { if (p.latitude === '' || p.longitude === '' || p.latitude === undefined || p.longitude === undefined || !p.locationName) throw new Error('Location is required. Enable GPS before continuing.'); }
function normalizeEmail_(v) { return String(v || '').trim().toLowerCase(); }
function isTruthy_(v) { return v === true || String(v).toLowerCase() === 'true' || String(v) === '1' || String(v).toLowerCase() === 'yes'; }
function ensureSheet_(ss, name, headers) { let sheet = ss.getSheetByName(name); if (!sheet) sheet = ss.insertSheet(name); if (sheet.getLastRow() === 0 || (sheet.getLastRow() === 1 && sheet.getLastColumn() <= headers.length + 2)) sheet.getRange(1,1,1,headers.length).setValues([headers]); return sheet; }
function styleSheet_(sheet, cols) { const h = sheet.getRange(1,1,1,cols); h.setBackground('#f97316').setFontColor('#ffffff').setFontWeight('bold').setVerticalAlignment('middle').setWrap(true); sheet.setRowHeight(1,34); for (let c=1;c<=cols;c++) sheet.setColumnWidth(c, c === 6 || c === 7 || c === 13 || c === 19 ? 190 : 135); }
function seedAdmin_(sheet) { if (dataRows_(sheet).length) return false; const email = normalizeEmail_(Session.getEffectiveUser().getEmail()); if (!email) return false; const password = 'ST-' + Utilities.getUuid().replace(/-/g,'').slice(0,12); sheet.appendRow([email,password,'admin','Administrator',true,new Date()]); return true; }
function dataRows_(sheet) { const n = sheet.getLastRow(); const cols = Math.max(sheet.getLastColumn(),1); return n < 2 ? [] : sheet.getRange(2,1,n-1,cols).getValues(); }
function getOrCreateFolder_(name) { const it = DriveApp.getFoldersByName(name); return it.hasNext() ? it.next() : DriveApp.createFolder(name); }
function saveImage_(folder, dataUrl, name) { const match = String(dataUrl || '').match(/^data:(image\/[\w.+-]+);base64,(.+)$/); if (!match) throw new Error('Invalid selfie image.'); const blob = Utilities.newBlob(Utilities.base64Decode(match[2]),match[1],name + '.jpg'); return folder.createFile(blob).getUrl(); }
function formatDate_(d) { return Utilities.formatDate(d,CONFIG.timezone,'yyyy-MM-dd'); }
function dateIso_(v) { if (!v) return ''; const d = new Date(v); return isNaN(d) ? String(v) : d.toISOString(); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
