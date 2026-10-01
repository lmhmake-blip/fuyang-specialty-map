#!/usr/bin/env node
/* ============================================================
   专项测试：view 缓存的失效
   ============================================================
   改 store.js 加了 viewCache 之后，唯一的风险是「云数据到了但缓存没作废」，
   那就一直给页面看过期的内置数据。这个测试专门盯这条路径：
     ① 云端还没回来时先读一次  → 缓存被 builtin 填满
     ② 等云端落地               → invalidate() 应该被打到
     ③ 再读                     → 必须看到 cloud 的新数据
   ============================================================ */
const ROOT = __dirname + '/..';
const STORE = ROOT + '/miniprogram/data/store.js';
const CATALOG = ROOT + '/miniprogram/data/catalog.js';
const catalog = require(CATALOG);

// 云端数据：把「枕头馍」标成下架 —— 用它来分辨读到的到底是 builtin 还是 cloud
const cloudProducts = catalog.PRODUCTS.map(function (p) {
  return Object.assign({}, p, {
    _id: p.id,
    id: undefined,
    onSale: p.id === 'zhentoumo' ? false : p.onSale,
  });
});

function cloudStub(docs) {
  return {
    database: function () {
      return {
        collection: function (name) {
          const all = docs[name] || [];
          let skip = 0, limit = 20;
          const q = {
            orderBy: function () { return q; },
            skip: function (n) { skip = n; return q; },
            limit: function (n) { limit = n; return q; },
            get: function () { return Promise.resolve({ data: all.slice(skip, skip + limit) }); },
          };
          return q;
        },
      };
    },
  };
}

global.wx = {
  getStorageSync: function () { return null; },
  setStorageSync: function () {},
  cloud: cloudStub({
    products: cloudProducts,
    districts: catalog.DISTRICTS,
    giftboxes: catalog.GIFT_BOXES,
  }),
};

let fail = 0;
function ok(name, cond, extra) {
  console.log((cond ? '✅ ' : '❌ ') + name + (extra !== undefined ? '   → ' + extra : ''));
  if (!cond) fail++;
}

(async function main() {
  const store = require(STORE);
  store.init();

  // ① 云端还没回来，先读一次 —— 这一步把 builtin 灌进 viewCache
  const before = store.allProducts();
  ok('云到达前：读到内置 22 条', before.length === 22, before.length);
  ok('云到达前：含枕头馍', before.some(function (p) { return p.id === 'zhentoumo'; }));

  // ② 等云端 Promise 落地
  await new Promise(function (r) { setTimeout(r, 60); });

  // ③ 再读 —— 缓存没失效的话，这里会拿到过期的 builtin
  const after = store.allProducts();
  ok('来源已切到 cloud', store.info().source === 'cloud', store.info().source);
  ok('缓存已失效，只剩 21 条', after.length === 21, after.length);
  ok('下架商品已从展示列表消失',
     !after.some(function (p) { return p.id === 'zhentoumo'; }));
  ok('P() 仍查得到下架商品（购物车算钱要用）', !!store.P('zhentoumo'));

  // ④ byDistrict 的桶缓存也要重建
  const yz = store.byDistrict('yingzhou');
  ok('byDistrict 桶缓存已重建',
     yz.length > 0 &&
     yz.every(function (p) { return p.d === 'yingzhou' && p.onSale !== false; }),
     yz.length + ' 款');

  console.log(fail === 0 ? '\n全部通过 ✅' : '\n有 ' + fail + ' 项失败 ❌');
  process.exit(fail === 0 ? 0 : 1);
})();
