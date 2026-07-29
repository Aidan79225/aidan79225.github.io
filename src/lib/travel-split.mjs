// 旅遊分帳 —— 純計算邏輯（無 DOM、無隨機、無時間），方便 node --test 驗證。
//
// 資料模型
//   trip = {
//     code, name, currency,
//     metaUpdatedAt,                       // 行程層級欄位(name/currency)的最後修改時間
//     members:  [ member ],
//     expenses: [ expense ],
//   }
//   member  = { id, name, deleted?, updatedAt }
//   expense = {
//     id, desc, amount, payerId,
//     splitMode: 'even' | 'weight' | 'exact',
//     sharedBy:  [memberId, ...],          // even 模式:平均分攤的人
//     weights:   { memberId: number },     // weight 模式:各人權重
//     exact:     { memberId: number },     // exact 模式:各人固定金額
//     date, category, deleted?, updatedAt,
//   }
//
// 金額一律以「分」為單位做整數運算,避免浮點誤差;對外回傳時再轉回元。

export const round2 = (x) => Math.round(x * 100) / 100;
const toCents = (x) => Math.round((Number(x) || 0) * 100);
const toUnit = (cents) => cents / 100;

// 把總額(分)平均切成 n 份,餘數 1 分 1 分地分給前幾份,確保加總 === 總額。
// keys 用來決定「前幾份」的順序,讓結果穩定可測。
function splitCentsEven(totalCents, keys) {
  const n = keys.length;
  const out = {};
  if (n === 0) return out;
  const base = Math.trunc(totalCents / n);
  let remainder = totalCents - base * n; // 可能為負(退款情境)
  const step = remainder >= 0 ? 1 : -1;
  remainder = Math.abs(remainder);
  const ordered = [...keys].sort();
  ordered.forEach((k, i) => {
    out[k] = base + (i < remainder ? step : 0);
  });
  return out;
}

// 依權重分配總額(分),用最大餘數法讓加總 === 總額。
function splitCentsByWeight(totalCents, weights) {
  const keys = Object.keys(weights).filter((k) => Number(weights[k]) > 0);
  const totalWeight = keys.reduce((s, k) => s + Number(weights[k]), 0);
  if (totalWeight <= 0) return splitCentsEven(totalCents, keys);
  const raw = keys.map((k) => ({
    k,
    exact: (totalCents * Number(weights[k])) / totalWeight,
  }));
  const out = {};
  let assigned = 0;
  raw.forEach((r) => {
    out[r.k] = Math.floor(r.exact);
    assigned += out[r.k];
  });
  let remainder = totalCents - assigned;
  // 餘數給小數部分最大的人
  const byFrac = [...raw].sort((a, b) => {
    const fa = a.exact - Math.floor(a.exact);
    const fb = b.exact - Math.floor(b.exact);
    if (fb !== fa) return fb - fa;
    return a.k < b.k ? -1 : 1;
  });
  for (let i = 0; remainder > 0; i = (i + 1) % byFrac.length) {
    out[byFrac[i].k] += 1;
    remainder -= 1;
  }
  return out;
}

// 單筆支出 → { memberId: 分攤金額(元) }。deleted 的支出回傳空物件。
export function shareOf(expense) {
  if (!expense || expense.deleted) return {};
  const totalCents = toCents(expense.amount);
  let cents = {};
  if (expense.splitMode === 'exact') {
    const ex = expense.exact || {};
    Object.keys(ex).forEach((k) => {
      cents[k] = toCents(ex[k]);
    });
  } else if (expense.splitMode === 'weight') {
    cents = splitCentsByWeight(totalCents, expense.weights || {});
  } else {
    cents = splitCentsEven(totalCents, expense.sharedBy || []);
  }
  const out = {};
  Object.keys(cents).forEach((k) => {
    out[k] = toUnit(cents[k]);
  });
  return out;
}

// 計算每位成員的淨額(元):付出的 - 應分攤的。正值=別人欠他,負值=他欠別人。
// 回傳 { memberId: net } 只含未刪除的成員。
export function computeBalances(members, expenses) {
  const alive = (members || []).filter((m) => !m.deleted);
  const net = {};
  alive.forEach((m) => {
    net[m.id] = 0;
  });
  (expenses || []).forEach((e) => {
    if (e.deleted) return;
    const shares = shareOf(e);
    if (e.payerId != null && net[e.payerId] != null) {
      net[e.payerId] = round2(net[e.payerId] + (Number(e.amount) || 0));
    }
    Object.keys(shares).forEach((k) => {
      if (net[k] != null) net[k] = round2(net[k] - shares[k]);
    });
  });
  Object.keys(net).forEach((k) => {
    net[k] = round2(net[k]);
  });
  return net;
}

// 每筆支出總額加總(未刪除)。
export function totalSpent(expenses) {
  return round2(
    (expenses || [])
      .filter((e) => !e.deleted)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0),
  );
}

// 由淨額算出「最少筆數」的還款方案:貪婪法,每次讓最大債務人還給最大債權人。
// 回傳 [{ from, to, amount }],amount 為正的元。
export function settle(net) {
  const debtors = []; // 欠錢(net<0)
  const creditors = []; // 被欠(net>0)
  Object.keys(net).forEach((k) => {
    const cents = Math.round(net[k] * 100);
    if (cents < 0) debtors.push({ id: k, cents: -cents });
    else if (cents > 0) creditors.push({ id: k, cents });
  });
  // 排序讓結果穩定
  debtors.sort((a, b) => b.cents - a.cents || (a.id < b.id ? -1 : 1));
  creditors.sort((a, b) => b.cents - a.cents || (a.id < b.id ? -1 : 1));

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].cents, creditors[j].cents);
    if (pay > 0) {
      transfers.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: toUnit(pay),
      });
    }
    debtors[i].cents -= pay;
    creditors[j].cents -= pay;
    if (debtors[i].cents === 0) i += 1;
    if (creditors[j].cents === 0) j += 1;
  }
  return transfers;
}

// ---- 多人協作合併(CRDT 式 last-write-wins) --------------------------------
// 兩份 trip 合併:member/expense 以 id 為鍵取 updatedAt 較新者(含 deleted 墓碑),
// 行程層級欄位(name/currency)取 metaUpdatedAt 較新者。可交換、可結合、冪等,
// 因此多人各自 pull→merge→push 最終會收斂到同一份資料。
function mergeById(listA, listB) {
  const map = new Map();
  const consider = (item) => {
    if (!item || item.id == null) return;
    const prev = map.get(item.id);
    if (!prev || (item.updatedAt || 0) >= (prev.updatedAt || 0)) {
      map.set(item.id, item);
    }
  };
  (listA || []).forEach(consider);
  (listB || []).forEach(consider);
  return [...map.values()];
}

export function mergeTrips(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  const aMeta = a.metaUpdatedAt || 0;
  const bMeta = b.metaUpdatedAt || 0;
  const metaWinner = bMeta > aMeta ? b : a;
  return {
    code: a.code || b.code,
    name: metaWinner.name,
    currency: metaWinner.currency,
    metaUpdatedAt: Math.max(aMeta, bMeta),
    members: mergeById(a.members, b.members),
    expenses: mergeById(a.expenses, b.expenses),
  };
}
