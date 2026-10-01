#!/usr/bin/env node
/* ============================================================
   购物车合并逻辑测试（app.js）
   ============================================================
   购物车从 ['sanzi','sanzi']（加几次就几行）改成 [{key,qty}]（合并成一行带数量）。
   这块逻辑在 app.js 里，原来没有任何测试覆盖。

   做法：把 App() 和 wx 打桩，拿到 App 的配置对象后直接调它的方法。
   ============================================================ */
const APP = __dirname + '/../miniprogram/app.js';

let captured = null;
global.App = function (cfg) { captured = cfg; };

let storage = {};
const noop = function () {};
global.wx = {
  getStorageSync: function (k) { return storage[k]; },
  setStorageSync: function (k, v) { storage[k] = v; },
  getWindowInfo: function () { return { statusBarHeight: 47 }; },
  getMenuButtonBoundingClientRect: function () { return { top: 55, height: 32 }; },
  cloud: null,   // 无云能力 → initCloud / pullCloud 都会安全早退
};

let fail = 0;
function ok(name, cond, extra) {
  console.log((cond ? '✅ ' : '❌ ') + name + (extra !== undefined ? '   → ' + extra : ''));
  if (!cond) fail++;
}
const keys = function (app) {
  return app.globalData.cart.map(function (l) { return l.key; }).join(',');
};
const qtyOf = function (app, key) {
  const l = app.globalData.cart.filter(function (x) { return x.key === key; })[0];
  return l ? l.qty : 0;
};

require(APP);
const app = captured;
app.globalData.cart = [];
app.globalData.orders = [];

console.log('— 合并 ——');
app.addToCart('sanzi');
app.addToCart('sanzi');
app.addToCart('sanzi');
ok('同一商品加 3 次只有 1 行', app.globalData.cart.length === 1, app.globalData.cart.length);
ok('数量累加到 3', qtyOf(app, 'sanzi') === 3, qtyOf(app, 'sanzi'));
ok('cartCount 返回件数 3', app.cartCount() === 3, app.cartCount());
const ret = app.addToCart('sanzi');          // 只调一次：断言里再调一次会产生副作用
ok('addToCart 返回值是件数', ret === 4, ret);

app.removeFromCart('sanzi');
app.addToCart('sanzi', 3);

console.log('\n— 顺序 ——');
app.addToCart('zhentoumo');
app.addToCart('box:阜阳年味礼盒');
ok('加入顺序保留，新加的在最后',
   keys(app) === 'sanzi,zhentoumo,box:阜阳年味礼盒', keys(app));
app.addToCart('zhentoumo');
ok('再次加入老商品不改变位置', keys(app) === 'sanzi,zhentoumo,box:阜阳年味礼盒', keys(app));

console.log('\n— 一次加多件 ——');
app.addToCart('matang', 5);
ok('addToCart(key, 5) 一次加 5 件', qtyOf(app, 'matang') === 5, qtyOf(app, 'matang'));
ok('件数合计 = 3+2+1+5', app.cartCount() === 11, app.cartCount());

console.log('\n— setQty ——');
app.setQty('sanzi', 1);
ok('setQty 改成 1', qtyOf(app, 'sanzi') === 1, qtyOf(app, 'sanzi'));
app.setQty('sanzi', 0);
ok('setQty(0) 删掉该行', app.globalData.cart.every(function (l) { return l.key !== 'sanzi'; }));
app.setQty('压根不存在', 9);
ok('setQty 对不存在的 key 无副作用', app.globalData.cart.length === 3, app.globalData.cart.length);

console.log('\n— 移除整行 ——');
app.removeFromCart('matang');
ok('removeFromCart 删整行，不是减 1',
   qtyOf(app, 'matang') === 0 && app.globalData.cart.length === 2, app.globalData.cart.length);

console.log('\n— 持久化 + 老数据迁移 ——');
ok('已写入 Storage 且是新格式',
   Array.isArray(storage['fy_cart']) && typeof storage['fy_cart'][0] === 'object',
   JSON.stringify(storage['fy_cart']));

// 模拟老版本残留：字符串数组，且同一商品重复
storage['fy_cart'] = ['sanzi', 'sanzi', 'zhentoumo', 'box:阜阳年味礼盒'];
delete require.cache[require.resolve(APP)];
captured = null;
const err = console.error;
console.error = noop;              // initCloud 会抱怨没有云能力，测试里不需要看
require(APP);                      // require 返回的是 module.exports({})，
captured.onLaunch.call(captured);  // App 配置对象是被 global.App 捕获的
console.error = err;

ok('老格式 4 条迁移成 3 行', captured.globalData.cart.length === 3, JSON.stringify(captured.globalData.cart));
ok('老格式重复的 sanzi 合并成 qty 2', qtyOf(captured, 'sanzi') === 2, qtyOf(captured, 'sanzi'));
ok('迁移后件数 = 4', captured.cartCount() === 4, captured.cartCount());

console.log(fail === 0 ? '\n全部通过 ✅' : '\n有 ' + fail + ' 项失败 ❌');
process.exit(fail === 0 ? 0 : 1);
