// 文章裡的 <div data-algo="名稱"> 對到哪個演算法模組。每個模組各自一個 chunk,
// 只有用到它的文章才會下載。新增演算法:寫一個 frame 產生器,在這裡登記一行。
export const ALGOS = {
  kadane: () => import('./kadane.mjs'),
  'max-subarray-race': () => import('./max-subarray-race.mjs'),
};
