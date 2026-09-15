// 車位抽籤 —— 驗證用的搬運層(無 DOM、無 XLSX 相依,方便 node --test 驗證)。
//
// 兩條路把「同一場抽籤」交到住戶手上：
//   1. 驗證連結：seed + 四份名單編碼進網址的 hash，點開即重跑
//   2. 匯入 Excel：把公告的 .xlsx 丟回頁面，還原名單並比對分配結果
//
// 兩者都必須完整保存「名單順序」——那是紙本登記順序，也是抽籤輸入的一部分。

const FIELDS = [
  ['h', 'households'],
  ['ph', 'priorityHouseholds'],
  ['p', 'parkings'],
  ['pp', 'priorityParkings'],
];

const toBase64Url = (bytes) => {
  let bin = '';
  const CHUNK = 0x8000; // 一次 spread 太多會爆堆疊
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (str) => {
  const bin = atob(String(str).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/** 把一場抽籤的輸入編成網址片段(放 hash，不會送到伺服器)。 */
export function encodeShare(input) {
  const payload = { v: 1, s: Number(input.seed) };
  for (const [key, name] of FIELDS) payload[key] = (input[name] ?? []).map(String);
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

/** 還原驗證連結。壞掉的連結一律丟錯，不要半套資料跑出一份假結果。 */
export function decodeShare(token) {
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(token)));
  } catch {
    throw new Error('驗證連結格式不正確');
  }
  if (!payload || payload.v !== 1) throw new Error('驗證連結版本不支援');
  if (!Number.isFinite(payload.s)) throw new Error('驗證連結缺少 seed');
  const out = { seed: payload.s };
  for (const [key, name] of FIELDS) {
    const list = payload[key];
    if (list !== undefined && !Array.isArray(list)) throw new Error('驗證連結的名單格式不正確');
    out[name] = (list ?? []).map(String);
  }
  return out;
}

/**
 * 從 Excel 的一張分頁還原名單，並保住順序。
 * 有「登記序號」就照序號排(委員在 Excel 裡不小心排序過也救得回來)，
 * 沒有就照列的先後 —— 舊版匯出的檔案沒有這一欄。
 */
export function rowsToList(rows, label) {
  if (!Array.isArray(rows)) return [];
  const picked = rows
    .map((row, i) => ({
      value: row?.[label] === undefined || row?.[label] === null ? '' : String(row[label]).trim(),
      order: Number(row?.['登記序號']),
      fallback: i,
    }))
    .filter((r) => r.value);
  const numbered = picked.every((r) => Number.isFinite(r.order));
  if (numbered) picked.sort((a, b) => a.order - b.order || a.fallback - b.fallback);
  return picked.map((r) => r.value);
}

/**
 * 比對重跑結果與檔案裡的分配結果。
 * @param {Array<{parking: string, household: string}>} actual   重跑出來的
 * @param {Array<{戶名: string, 車位: string}>} expectedRows      Excel「分配結果」分頁
 */
export function compareAllocation(actual, expectedRows) {
  const mine = new Map(actual.filter((r) => r.household).map((r) => [String(r.household), String(r.parking)]));
  const theirs = new Map(
    (expectedRows ?? [])
      .filter((r) => r && r['戶名'])
      .map((r) => [String(r['戶名']).trim(), String(r['車位']).trim()]),
  );
  const mismatched = [];
  const missing = [];   // 檔案有、重跑沒有
  const extra = [];     // 重跑有、檔案沒有
  for (const [household, parking] of theirs) {
    if (!mine.has(household)) missing.push(household);
    else if (mine.get(household) !== parking) {
      mismatched.push({ household, expected: parking, actual: mine.get(household) });
    }
  }
  for (const household of mine.keys()) if (!theirs.has(household)) extra.push(household);
  return {
    ok: theirs.size > 0 && mismatched.length === 0 && missing.length === 0 && extra.length === 0,
    checked: theirs.size,
    mismatched,
    missing,
    extra,
  };
}
