/* ============================================================
   取数层 store
   ============================================================
   要解决的两件事：

   1）小程序取数必须异步，但页面直接写异步会白屏
   2）购物车 / 结算要「同步」算钱，不能等网络

   做法：内存里永远有一份同步可用的数据，三个来源依次覆盖：
       ① 内置 data/catalog.js   冷启动兜底，断网也能用
       ② Storage 缓存           上次从云端拉到的
       ③ 云数据库               真数据，拉到后更新内存 + 写缓存

   页面两种用法：

     同步读（随时可用，不返回 Promise）
       store.allDistricts() / store.allProducts() / store.allGiftboxes()
       store.byDistrict('yingzhou') / store.P('zhentoumo') / store.cartTotal(cart)

     订阅更新（云端数据到达后重渲染一次）
       onLoad() { this.render(); store.onUpdate(() => this.render()); }
   ============================================================ */

const catalog = require('./catalog.js');

const CACHE_KEY = 'fy_data_v1';
const PAGE = 20;                 // ⚠️ 小程序端单次查询上限就是 20 条，必须分页
const COLLECTIONS = ['districts', 'products', 'giftboxes'];

// ---- 内置兜底数据 ----
const BUILTIN = {
  districts: catalog.DISTRICTS,
  products: catalog.PRODUCTS,
  giftboxes: catalog.GIFT_BOXES,
};

// ---- 内存态：永远同步可用 ----
const mem = {
  districts: BUILTIN.districts,
  products: BUILTIN.products,      // 全量（含已下架，购物车算钱要用）
  giftboxes: BUILTIN.giftboxes,
  source: 'builtin',               // builtin | cache | cloud
};

// ---- 更新通知：只在云端数据回来时统一通知一次 ----
// 通知完就清空：一次冷启动只会更新一次，之后加载的页面
// 在 onLoad 里直接就能读到最新数据，不需要再通知。
let listeners = [];
let cloudLoaded = false;

// ============================================================
//  内部工具
// ============================================================

// 云数据库返回 _id，catalog.js 用 id —— 统一成 id，页面不用关心数据来自哪
function normalize(doc) {
  const o = Object.assign({}, doc);
  if (o.id === undefined && o._id !== undefined) o.id = o._id;
  return o;
}

// 显式排序：数据库不保证顺序。内置数据没有 sort 字段，
// 全部相等时 Array.sort 是稳定排序，会保留原顺序。
function bySort(a, b) { return (a.sort || 0) - (b.sort || 0); }

// 给页面看的数据：排序 + 过滤掉已下架
//
// 结果做缓存：一次页面渲染会连着调 allDistricts + byDistrict×8 + allProducts，
// 每次都 slice+sort+filter 纯属浪费；商家自主上架、SKU 涨上来之后更明显。
// mem 一变就 invalidate()。
// ⚠️ 返回的是缓存数组本身 —— 调用方只读，要改先自己 slice()。
let viewCache = null;

function invalidate() { viewCache = null; }

function buildView() {
  const districts = mem.districts.slice().sort(bySort);
  const giftboxes = mem.giftboxes.slice().sort(bySort);
  const products = mem.products.slice().sort(bySort).filter(p => p.onSale !== false);

  // 按县区分桶：建一次，byDistrict 之后直接查表，不再每次 filter 三趟
  const buckets = {};
  products.forEach(p => {
    if (!buckets[p.d]) buckets[p.d] = [];
    buckets[p.d].push(p);
  });

  return { districts: districts, products: products, giftboxes: giftboxes, buckets: buckets };
}

function view(key) {
  if (!viewCache) viewCache = buildView();
  return viewCache[key];
}

function viewByDistrict(id) {
  if (!viewCache) viewCache = buildView();
  return viewCache.buckets[id] || [];
}

function emit() {
  const cbList = listeners;
  listeners = [];
  cbList.forEach(cb => {
    try { cb(); } catch (e) { console.error('[store] 更新回调出错', e); }
  });
}

// ============================================================
//  缓存读写
// ============================================================
function loadCache() {
  try {
    const c = wx.getStorageSync(CACHE_KEY);
    if (!c || !c.products || !c.products.length) return false;
    COLLECTIONS.forEach(k => { if (c[k] && c[k].length) mem[k] = c[k].map(normalize); });
    mem.source = 'cache';
    invalidate();
    return true;
  } catch (e) {
    console.warn('[store] 读缓存失败', e);
    return false;
  }
}

function saveCache() {
  try {
    const payload = { savedAt: Date.now() };
    COLLECTIONS.forEach(k => { payload[k] = mem[k]; });
    wx.setStorageSync(CACHE_KEY, payload);
  } catch (e) {
    console.warn('[store] 写缓存失败', e);
  }
}

// ============================================================
//  云端拉取
// ============================================================

// 分页取全量。
// ⚠️ 这里刻意用 Promise 链而不是 async/await：小程序编译链对 async 的支持
//    取决于「增强编译」是否生效，一旦转译出问题会在 app.js 加载阶段就抛错，
//    表现是整屏白。Promise 链没有这个风险。
// orderBy('sort') 是为了让分页稳定（不然 skip 可能重复/漏记录）。
function fetchAll(name) {
  const col = wx.cloud.database().collection(name);
  const out = [];

  function page(skip) {
    return col.orderBy('sort', 'asc').skip(skip).limit(PAGE).get()
      .then(res => {
        const batch = (res && res.data) || [];
        out.push.apply(out, batch);
        if (batch.length < PAGE) return out;        // 最后一页
        if (skip + PAGE >= 2000) return out;        // 保险丝
        return page(skip + PAGE);
      });
  }
  return page(0);
}

function pullCloud() {
  // 不走 getApp()：onLaunch 阶段 getApp() 不一定可用。
  // 云没初始化时下面的 database() 会抛错，被 catch 兜住，退回缓存/内置。
  if (!wx.cloud) return;
  try {
    Promise.all(COLLECTIONS.map(name => fetchAll(name)))
      .then(results => {
        let changed = false;
        COLLECTIONS.forEach((k, i) => {
          if (results[i] && results[i].length) {
            mem[k] = results[i].map(normalize);
            changed = true;
          }
        });
        if (!changed) return;
        mem.source = 'cloud';
        cloudLoaded = true;
        invalidate();
        saveCache();
        emit();
      })
      .catch(e => {
        // 拉不到就用缓存/内置继续跑，不打扰用户
        console.warn('[store] 云端拉取失败，沿用本地数据', e);
      });
  } catch (e) {
    console.warn('[store] 云端拉取异常，沿用本地数据', e);
  }
}

// ============================================================
//  对外接口
// ============================================================

function init() {
  loadCache();      // 同步，页面 onLoad 时数据已就绪，不会白屏
  pullCloud();      // 异步，拿到后覆盖内存 + 通知已注册的页面
}

// 云端数据到达时回调一次（之后清空）。数据没变化时不会触发。
// 页面用法：
//   onLoad() { this.render(); store.onUpdate(() => this.render()); }
function onUpdate(cb) { listeners.push(cb); }

// 页面 onUnload 时摘掉自己的回调。不摘的两个后果：
//   ① 云端数据回来时页面可能已经销毁 → 对死页面 setData，控制台报错
//   ② 断网时 emit() 永不触发，listeners 只增不减
function offUpdate(cb) {
  const i = listeners.indexOf(cb);
  if (i > -1) listeners.splice(i, 1);
}

// 购物车两种条目：商品 与 礼盒。
// 入参是 [{key, qty}]；同时兼容老的字符串格式 ['sanzi','sanzi']，
// 这样 Storage 里还没迁移的旧数据也不会炸。
function cartItemsOf(cart) {
  return (cart || []).map(line => {
    const key = typeof line === 'string' ? line : (line && line.key);
    if (!key) return null;
    const qty = (typeof line === 'string' || !(line.qty > 0)) ? 1 : line.qty;

    if (key.indexOf('box:') === 0) {
      const g = mem.giftboxes.find(x => x.name === key.slice(4));
      return g ? { type: 'box', name: g.name, price: g.price, color: g.color,
                   short: '礼盒', unit: '礼盒装', sub: '组合礼盒',
                   key: key, qty: qty, subtotal: g.price * qty } : null;
    }
    const pr = mem.products.find(p => p.id === key);
    return pr ? { type: 'product', name: pr.name, price: pr.price, color: pr.color,
                  short: pr.short, unit: pr.unit, sub: pr.sub,
                  key: key, qty: qty, subtotal: pr.price * qty } : null;
  }).filter(Boolean);
}

// 件数 = 数量之和（不是行数）。购物车角标、结算页都用它。
function cartCountOf(cart) {
  return (cart || []).reduce((s, l) => {
    if (!l) return s;
    return s + (typeof l === 'string' ? 1 : (l.qty > 0 ? l.qty : 1));
  }, 0);
}

// 调试用：看看现在数据是从哪来的
//
// ⚠️⚠️ 踩过的坑（2026-09-29，排查了 1 小时）⚠️⚠️
//   这个函数原本写成 module.exports 里的一个箭头属性：
//       info: () => ({ source: mem.source, cloudLoaded, counts: {...} })
//   结果**整个 store.js 不会被编译进小程序包**，报错是
//       Error: module 'data/store.js' is not defined
//   首页全白、getApp() 返回空，而且开发者工具**不给任何编译报错**，极难查。
//
//   二分排查结论：问题就出在「箭头函数直接返回一个带【简写属性】的对象字面量」
//   这种写法（`cloudLoaded` 是简写属性）。文件头部、其余导出属性、
//   方法简写、module.exports 自引用、箭头函数本身，都已逐个排除过。
//
//   **本文件（以及本项目其他文件）请避免这种写法**：
//       别写  key: () => ({ a, b: 1 })
//       改成  function () { return { a: a, b: 1 }; }
//   简写属性本身没问题，箭头函数本身也没问题，两者组合在 module.exports
//   字面量里会出事。
function storeInfo() {
  return { source: mem.source, cloudLoaded: cloudLoaded,
           counts: { districts: mem.districts.length, products: mem.products.length,
                     giftboxes: mem.giftboxes.length } };
}

module.exports = {
  init,
  onUpdate,
  offUpdate,

  // ---- 同步读：随时可用，不返回 Promise ----
  allDistricts: () => view('districts'),
  allProducts:  () => view('products'),
  allGiftboxes: () => view('giftboxes'),

  // ---- 同步查询：与 catalog.js 同名同签名，页面只改 require 路径即可 ----
  P: id => mem.products.find(p => p.id === id),
  D: id => mem.districts.find(d => d.id === id),
  byDistrict: viewByDistrict,

  cartItems: cartItemsOf,
  cartCount: cartCountOf,
  cartTotal: cart => cartItemsOf(cart).reduce((s, i) => s + i.subtotal, 0),
  shipFee: total => (total >= 199 ? 0 : 12),

  info: storeInfo,
};
