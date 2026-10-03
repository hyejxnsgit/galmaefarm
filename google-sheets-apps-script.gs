const ORDER_SHEET = '주문내역';
const DAILY_SHEET = '일별요약';
const MEMBER_SHEET = '회원관리';
const SPREADSHEET_ID = '1Bj7csGkS3lhsJMDM6l_ngIbL2paYRq6Yi7AB1hqJqd8';
const SYNC_STATUS_PREFIX = 'hannubong-sync-';

const ORDER_HEADERS = [
  '주문일시', '주문번호', '상품코드', '상품명', '수량', '정가(단가)',
  '할인 판매가(단가)', '할인액', '실제 매출', '원가(단가)', '총 원가',
  '예상 이익', '주문자', '주문자전화', '수령자', '수령자전화', '주소', '주문상태', '문자발송'
];
const DAILY_HEADERS = ['날짜', '주문 건수', '매출', '할인액', '총 원가', '예상 이익', '마지막 업데이트'];
const MEMBER_HEADERS = ['가입일', '회원번호', '이름', '휴대전화', '상태', '마케팅 동의', '가입 경로', '마지막 로그인', '최근 구매일', '메모'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let syncId = '';
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    syncId = String(data.syncId || '');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (data.action === 'member-signup') {
      const result = addMember_(spreadsheet, data.member || {});
      saveSyncStatus_(syncId, result);
      return json_(result);
    }
    const orderSheet = getOrCreateSheet_(spreadsheet, ORDER_SHEET, ORDER_HEADERS);
    const dailySheet = getOrCreateSheet_(spreadsheet, DAILY_SHEET, DAILY_HEADERS);

    const existingIds = orderSheet.getLastRow() < 2
      ? new Set()
      : new Set(orderSheet.getRange(2, 2, orderSheet.getLastRow() - 1, 1).getDisplayValues().flat());
    const newRows = (data.orders || [])
      .filter(order => order.orderId && !existingIds.has(String(order.orderId)))
      .map(order => [
        order.orderDateTime || '', order.orderId || '', order.productCode || '', order.productName || '',
        numberOrBlank_(order.quantity), numberOrBlank_(order.listUnitPrice), numberOrBlank_(order.saleUnitPrice),
        numberOrBlank_(order.discount), numberOrBlank_(order.revenue), numberOrBlank_(order.unitCost),
        numberOrBlank_(order.totalCost), numberOrBlank_(order.expectedProfit), order.buyerName || '',
        order.buyerPhone || '', order.recipientName || '', order.recipientPhone || '', order.address || '',
        order.status || '', order.sms || ''
      ]);
    if (newRows.length) {
      orderSheet.getRange(orderSheet.getLastRow() + 1, 1, newRows.length, ORDER_HEADERS.length).setValues(newRows);
    }

    if (data.dailySummary && data.dailySummary.date) {
      upsertDailySummary_(dailySheet, data.dailySummary, data.exportedAt || new Date().toISOString());
    }
    formatSheets_(orderSheet, dailySheet);
    const result = {
      ok: true,
      status: 'success',
      addedOrders: newRows.length,
      skippedOrders: Math.max(0, (data.orders || []).length - newRows.length),
      syncedAt: new Date().toISOString()
    };
    saveSyncStatus_(syncId, result);
    return json_(result);
  } catch (error) {
    const result = { ok: false, status: 'error', message: error.message };
    saveSyncStatus_(syncId, result);
    return json_(result);
  } finally {
    lock.releaseLock();
  }
}

function addMember_(spreadsheet, member) {
  const sheet = getOrCreateSheet_(spreadsheet, MEMBER_SHEET, MEMBER_HEADERS);
  const phone = normalizePhone_(member.phone);
  const name = safeText_(member.name);
  const memberId = safeText_(member.memberId);
  if (!memberId || !name || phone.length < 10) throw new Error('회원 정보를 확인해주세요.');
  const existingPhones = sheet.getLastRow() < 2
    ? []
    : sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).getDisplayValues().flat().map(normalizePhone_);
  if (existingPhones.includes(phone)) throw new Error('이미 가입한 휴대전화 번호입니다.');
  sheet.appendRow([
    member.joinedAt || new Date().toISOString(), memberId, name, displayPhone_(phone), '활성',
    member.marketing === '동의' ? '동의' : '미동의', safeText_(member.source || '한누봉 웹사이트'), '', '', ''
  ]);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, MEMBER_HEADERS.length).setVerticalAlignment('middle');
  return { ok: true, status: 'success', addedMembers: 1, memberId: memberId, syncedAt: new Date().toISOString() };
}

function doGet(e) {
  const mode = String((e && e.parameter && e.parameter.mode) || 'health');
  const callback = String((e && e.parameter && e.parameter.callback) || '');
  let result;
  try {
    if (mode === 'status') {
      const syncId = String(e.parameter.syncId || '');
      const saved = syncId && PropertiesService.getScriptProperties().getProperty(SYNC_STATUS_PREFIX + syncId);
      result = saved ? JSON.parse(saved) : { ok: true, status: 'pending' };
    } else {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      result = { ok: true, status: 'ready', spreadsheetName: spreadsheet.getName(), version: '2026-10-02.2', capabilities: { sales: true, members: true } };
    }
  } catch (error) {
    result = { ok: false, status: 'error', message: error.message };
  }
  return callback ? javascript_(callback, result) : json_(result);
}

function saveSyncStatus_(syncId, result) {
  if (!syncId) return;
  PropertiesService.getScriptProperties().setProperty(SYNC_STATUS_PREFIX + syncId, JSON.stringify(result));
}

function getOrCreateSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function upsertDailySummary_(sheet, summary, exportedAt) {
  const dates = sheet.getLastRow() < 2
    ? []
    : sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
  const foundIndex = dates.findIndex(value => value === String(summary.date));
  const rowNumber = foundIndex === -1 ? sheet.getLastRow() + 1 : foundIndex + 2;
  sheet.getRange(rowNumber, 1, 1, DAILY_HEADERS.length).setValues([[
    summary.date,
    numberOrBlank_(summary.orderCount),
    numberOrBlank_(summary.revenue),
    numberOrBlank_(summary.discount),
    numberOrBlank_(summary.totalCost),
    numberOrBlank_(summary.expectedProfit),
    exportedAt
  ]]);
}

function formatSheets_(orderSheet, dailySheet) {
  [orderSheet, dailySheet].forEach(sheet => {
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setBackground('#4A2F22').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  });
  if (orderSheet.getLastRow() > 1) {
    orderSheet.getRange(2, 6, orderSheet.getLastRow() - 1, 7).setNumberFormat('#,##0');
  }
  if (dailySheet.getLastRow() > 1) {
    dailySheet.getRange(2, 2, dailySheet.getLastRow() - 1, 5).setNumberFormat('#,##0');
  }
}

function numberOrBlank_(value) {
  return value === null || value === undefined || value === '' ? '' : Number(value);
}

function normalizePhone_(value) {
  return String(value || '').replace(/\D/g, '');
}

function displayPhone_(value) {
  const digits = normalizePhone_(value);
  return digits.length === 11 ? digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7) : digits;
}

function safeText_(value) {
  const text = String(value || '').trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function javascript_(callback, value) {
  const safeCallback = callback.replace(/[^a-zA-Z0-9_$]/g, '');
  return ContentService
    .createTextOutput(`${safeCallback}(${JSON.stringify(value)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
