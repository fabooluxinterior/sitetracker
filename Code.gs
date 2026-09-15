/** SiteTrack Google Sheets backend
 * 1. Create a blank Google Sheet.
 * 2. Extensions > Apps Script, paste this file, then run setup() once.
 * 3. Deploy > New deployment > Web app; execute as you and allow anyone with the link.
 * 4. Put the /exec URL into the app's API_URL setting/localStorage.
 */
const CONFIG = {
  visitSheet: 'Visits',
  customerSheet: 'Customers',
  driveFolder: 'SiteTrack Uploads',
  timezone: Session.getScriptTimeZone() || 'Asia/Kolkata'
};
const VISIT_HEADERS = ['Visit ID','Recorded At','Visit Date','Coordinator ID','Customer ID','Client Name','Site Location','Workers','Working Day','Total Days','Pending Works','Selfie Time','Selfie Latitude','Selfie Longitude','Selfie Photo URL','Site Photo URLs','Sync Status'];
const CUSTOMER_HEADERS = ['Customer ID','Client Name','Site Location','Last Visit At','Last Coordinator ID','Total Visits'];

function setup() {
  const ss = SpreadsheetApp.getActive();
  const visits = getOrCreateSheet_(ss, CONFIG.visitSheet, VISIT_HEADERS);
  const customers = getOrCreateSheet_(ss, CONFIG.customerSheet, CUSTOMER_HEADERS);
  styleSheet_(visits, VISIT_HEADERS.length);
  styleSheet_(customers, CUSTOMER_HEADERS.length);
  visits.setFrozenRows(1); customers.setFrozenRows(1);
  visits.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm');
  customers.getRange('D:D').setNumberFormat('yyyy-mm-dd hh:mm');
  return 'SiteTrack sheets ready';
}

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'health';
  if (action === 'health') return json_({ok:true,service:'SiteTrack'});
  if (action === 'search') return json_({customers: searchCustomers_(e.parameter.q || '')});
  if (action === 'customers') return json_({customers: recentCustomers_()});
  if (action === 'days_used') return json_({days: daysUsed_(e.parameter.coordinatorId || '', e.parameter.customerId || '')});
  return json_({ok:false,error:'Unknown action'});
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    if (!payload.visitId && !payload.id) throw new Error('Missing visit ID');
    const ss = SpreadsheetApp.getActive();
    const visits = getOrCreateSheet_(ss, CONFIG.visitSheet, VISIT_HEADERS);
    const folder = getOrCreateFolder_(CONFIG.driveFolder);
    const selfieUrl = payload.selfieDataUrl ? saveImage_(folder, payload.selfieDataUrl, 'selfie_' + (payload.id || payload.visitId)) : '';
    const siteUrls = (payload.sitePhotos || []).map((data, i) => saveImage_(folder, data, 'site_' + (payload.id || payload.visitId) + '_' + (i+1))).filter(Boolean);
    const recorded = payload.createdAt ? new Date(payload.createdAt) : new Date();
    const row = [payload.id || payload.visitId, recorded, payload.visitDate || formatDate_(recorded), payload.coordinatorId || '', payload.customerId || '', payload.clientName || '', payload.siteLocation || '', Number(payload.workers || 0), Number(payload.workingDay || 1), 15, payload.pendingWorks || '', payload.selfieCapturedAt || '', payload.selfieLatitude || '', payload.selfieLongitude || '', selfieUrl, siteUrls.join('\n'), 'synced'];
    const existing = findRow_(visits, row[0]);
    if (existing) visits.getRange(existing, 1, 1, row.length).setValues([row]); else visits.appendRow(row);
    upsertCustomer_(ss, payload, recorded);
    return json_({ok:true,visitId:row[0],selfieUrl:selfieUrl,sitePhotoUrls:siteUrls});
  } catch (err) {
    return json_({ok:false,error:String(err)});
  }
}

function recentCustomers_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = getOrCreateSheet_(ss, CONFIG.customerSheet, CUSTOMER_HEADERS);
  const rows = dataRows_(sheet);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return rows.filter(r => new Date(r[3]).getTime() >= cutoff).map(customerObject_);
}
function searchCustomers_(q) {
  const sheet = getOrCreateSheet_(SpreadsheetApp.getActive(), CONFIG.customerSheet, CUSTOMER_HEADERS);
  const needle = String(q).toLowerCase();
  return dataRows_(sheet).map(customerObject_).filter(c => (c.name + ' ' + c.location).toLowerCase().indexOf(needle) >= 0);
}
function daysUsed_(coordinatorId, customerId) {
  const sheet = getOrCreateSheet_(SpreadsheetApp.getActive(), CONFIG.visitSheet, VISIT_HEADERS);
  const rows = dataRows_(sheet), days = {};
  rows.forEach(r => { if (String(r[3]) === coordinatorId && String(r[4]) === customerId) days[String(r[2])] = true; });
  return Object.keys(days).slice(-15);
}
function customerObject_(r) { return {customerId:String(r[0]),name:String(r[1]),location:String(r[2]),lastVisit:dateIso_(r[3]),coordinatorId:String(r[4]),totalVisits:Number(r[5]||0)}; }
function upsertCustomer_(ss, p, recorded) {
  const sheet = getOrCreateSheet_(ss, CONFIG.customerSheet, CUSTOMER_HEADERS);
  const id = p.customerId || (p.clientName + '|' + p.siteLocation);
  const rows = dataRows_(sheet); let index = rows.findIndex(r => String(r[0]) === id);
  if (index < 0) sheet.appendRow([id,p.clientName||'',p.siteLocation||'',recorded,p.coordinatorId||'',1]);
  else { const rowNo=index+2, count=Number(rows[index][5]||0)+1; sheet.getRange(rowNo,2,1,5).setValues([[p.clientName||'',p.siteLocation||'',recorded,p.coordinatorId||'',count]]); }
}
function saveImage_(folder, dataUrl, name) { const match=String(dataUrl).match(/^data:(image\/[\w.+-]+);base64,(.+)$/); if(!match)return ''; const blob=Utilities.newBlob(Utilities.base64Decode(match[2]),match[1],name+'.jpg'); return folder.createFile(blob).getUrl(); }
function getOrCreateFolder_(name) { const it=DriveApp.getFoldersByName(name); return it.hasNext()?it.next():DriveApp.createFolder(name); }
function getOrCreateSheet_(ss, name, headers) { let s=ss.getSheetByName(name); if(!s)s=ss.insertSheet(name); if(s.getLastRow()===0)s.appendRow(headers); return s; }
function styleSheet_(sheet, cols) { const h=sheet.getRange(1,1,1,cols); h.setBackground('#123b5d').setFontColor('#ffffff').setFontWeight('bold').setVerticalAlignment('middle'); h.setWrap(true); sheet.setRowHeight(1,32); sheet.getDataRange().setVerticalAlignment('middle'); for(let c=1;c<=cols;c++)sheet.setColumnWidth(c, c===11?260:(c===7?190:135)); }
function dataRows_(sheet) { const n=sheet.getLastRow(); return n<2?[]:sheet.getRange(2,1,n-1,sheet.getLastColumn()).getValues(); }
function findRow_(sheet,id) { const values=sheet.getRange('A:A').getValues(); for(let i=1;i<values.length;i++)if(String(values[i][0])===String(id))return i+1; return 0; }
function formatDate_(d) { return Utilities.formatDate(d,CONFIG.timezone,'yyyy-MM-dd'); }
function dateIso_(v) { const d=new Date(v); return isNaN(d)?String(v):d.toISOString(); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
