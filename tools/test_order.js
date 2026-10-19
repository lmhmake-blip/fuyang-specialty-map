#!/usr/bin/env node
/* ============================================================
   订单快照测试
   ============================================================
   覆盖三件事：
     ① utils/order.js 的纯函数（快照 / 金额 / 件数 / 展示文本）
     ② 结算页提交时把 qty、subtotal、count、goodsTotal、ship、total 存进订单
     ③ 我的订单页对旧订单的兼容：无 qty 按 1 件算、不显示「共 N 件」、
        只列商品名，而且不回写 Storage

   断言用字面量，不拿被测函数自己算期望值。
   用法：node tools/test_order.js
   ============================================================ */
const path = require('path');
const ORDER = path.join(__dirname, '..', 'miniprogram', 'utils', 'order.js');
const CHECKOUT = path.join(__dirname, '..', 'miniprogram', 'pages', 'checkout', 'checkout.js');
const ORDERS_PAGE = path.join(__dirname, '..', 'miniprogram', 'pages', 'orders', 'orders.js');

const order = require(ORDER);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra !== undefined ? '   → ' + extra : ''}`);
  if (!cond) fail++;
};
const head = t => console.log(`\n— ${t} —`);

// 把 Page 配置对象变成可调用的假页面：方法照搬，data 深拷贝，setData 合并
function makePage(cfg) {
  const page = Object.assign({}, cfg);
  page.data = JSON.parse(JSON.stringify(cfg.data));
  page.setData = function (patch) { Object.assign(this.data, patch); };
  return page;
}

// ============================================================
// ① 纯函数
// ============================================================
head('购物车 → 订单快照');
const cart = [
  { key: 'zhentoumo', name: '枕头馍', price: 38, qty: 2, color: '#8F4A3C', short: '馍' },
  { key: 'box:阜阳年味礼盒', name: '阜阳年味礼盒', price: 188, qty: 1, color: '#A8442F' },
];
const snap = order.snapshotItems(cart);
ok('快照 2 条', snap.length === 2, snap.length);
ok('保留数量 2', snap[0].qty === 2, snap[0].qty);
ok('小计 38×2 = 76', snap[0].subtotal === 76, snap[0].subtotal);
ok('礼盒数量 1', snap[1].qty === 1, snap[1].qty);
ok('礼盒小计 188', snap[1].subtotal === 188, snap[1].subtotal);
ok('不把购物车专用的 color 带进订单', snap[0].color === undefined);
ok('不修改原数组（原条目仍无 subtotal）', cart[0].subtotal === undefined);
ok('缺 qty 按 1 件',
   order.snapshotItems([{ name: '枕头馍', price: 38 }])[0].qty === 1);
ok('qty 为 0 视为非法，快照里标成 null',
   order.snapshotItems([{ name: '枕头馍', price: 38, qty: 0 }])[0].qty === null);

head('数量合法性 · 只认正整数');
ok('正整数 2 合法', order.qtyOf({ qty: 2 }) === 2);
ok('缺 qty 字段按 1 件（旧订单兼容）', order.qtyOf({ name: '枕头馍', price: 38 }) === 1);
ok('qty 为 null 按 1 件（旧订单兼容）', order.qtyOf({ qty: null }) === 1);
ok('小数 1.5 非法', order.qtyOf({ qty: 1.5 }) === null);
ok('0 非法', order.qtyOf({ qty: 0 }) === null);
ok('负数 -2 非法', order.qtyOf({ qty: -2 }) === null);
ok('NaN 非法', order.qtyOf({ qty: NaN }) === null);
ok('字符串 "2" 非法（只认数字）', order.qtyOf({ qty: '2' }) === null);
ok('hasInvalidQty 能发现小数', order.hasInvalidQty([{ qty: 2 }, { qty: 1.5 }]) === true);
ok('hasInvalidQty 不会误伤旧订单',
   order.hasInvalidQty([{ name: '枕头馍', price: 38 }, { name: '阜阳年味礼盒', price: 188 }]) === false);

head('金额与件数');
ok('itemsTotal = 76 + 188 = 264', order.itemsTotal(snap) === 264, order.itemsTotal(snap));
ok('itemCount = 2 + 1 = 3', order.itemCount(snap) === 3, order.itemCount(snap));
ok('空清单金额 0', order.itemsTotal([]) === 0);
ok('空清单件数 0', order.itemCount([]) === 0);

// 旧订单：checkout 以前只存了 name/price，没有 qty
const oldItems = [
  { name: '枕头馍', price: 38 },
  { name: '阜阳年味礼盒', price: 188 },
];
ok('旧订单金额按 1 件算：38 + 188 = 226', order.itemsTotal(oldItems) === 226,
   order.itemsTotal(oldItems));
ok('旧订单件数 2', order.itemCount(oldItems) === 2, order.itemCount(oldItems));

head('展示文本 · 新订单');
const newOrder = { no: 'FY2610191234', items: snap, count: 3, goodsTotal: 264, ship: 0, total: 264 };
ok('新订单显示「名称 × 数量」',
   order.itemsText(newOrder) === '枕头馍 × 2 · 阜阳年味礼盒 × 1', order.itemsText(newOrder));
ok('新订单显示「共 3 件」', order.displayCount(newOrder) === '共 3 件', order.displayCount(newOrder));

head('展示文本 · 旧订单');
const oldOrder = { no: 'FY2501010001', items: oldItems, total: 226 };
ok('旧订单只列商品名',
   order.itemsText(oldOrder) === '枕头馍 · 阜阳年味礼盒', order.itemsText(oldOrder));
ok('旧订单不显示「共 N 件」', order.displayCount(oldOrder) === '', order.displayCount(oldOrder));

// ============================================================
// ② 结算页：订单字段是否存全
// ============================================================
head('结算页提交');
let capturedPage = null;
global.Page = cfg => { capturedPage = cfg; };
let added = null;
let cleared = false;
const app = {
  globalData: {
    cart: [
      { key: 'zhentoumo', qty: 2 },
      { key: 'box:阜阳年味礼盒', qty: 1 },
    ],
    orders: [],
    statusBarHeight: 20,
  },
  addOrder(o) { added = o; },
  clearCart() { cleared = true; },
};
global.getApp = () => app;
global.wx = { redirectTo() {} };

delete require.cache[require.resolve(CHECKOUT)];
require(CHECKOUT);
const page = makePage(capturedPage);
page.onLoad();
page.data.form = { name: '张三', phone: '13800138000', addr: '上海市黄浦区南京东路 1 号', note: '' };
page.submit();

ok('提交后清空购物车', cleared === true);
ok('订单写入 2 条商品', added && added.items.length === 2, added && added.items.length);
ok('订单条目带 qty', added.items[0].qty === 2, added.items[0].qty);
ok('订单条目带 subtotal', added.items[0].subtotal === 76, added.items[0].subtotal);
ok('订单 count = 3', added.count === 3, added.count);
ok('订单 goodsTotal = 264', added.goodsTotal === 264, added.goodsTotal);
ok('订单 ship = 0（满 199 免运费）', added.ship === 0, added.ship);
ok('订单 total = 264', added.total === 264, added.total);
ok('订单条目不再只有 name/price',
   added.items[0].key === 'zhentoumo' && added.items[0].name === '枕头馍');
ok('默认 shipWay = 0', added.shipWay === 0, added.shipWay);
ok('默认 payWay = 0', added.payWay === 0, added.payWay);
ok('备注为空时存空字符串', added.note === '', JSON.stringify(added.note));

head('结算页提交 · 配送 / 支付 / 备注');
added = null;
cleared = false;
page.data.shipWay = 1;
page.data.payWay = 1;
page.data.form = {
  name: '张三', phone: '13800138000', addr: '上海市黄浦区南京东路 1 号',
  note: '  要发票，工作日送达  ',
};
page.submit();
ok('订单存 shipWay = 1', added && added.shipWay === 1, added && added.shipWay);
ok('订单存 payWay = 1', added && added.payWay === 1, added && added.payWay);
ok('备注先 trim 再存', added && added.note === '要发票，工作日送达', added && added.note);

head('结算页提交 · 非法数量拒绝下单');
// 数量非法时必须提示并且不下单、不清购物车
function rejectedWithQty(qty) {
  added = null;
  cleared = false;
  page.data.toastText = '';
  page.data.items = [{ key: 'zhentoumo', name: '枕头馍', price: 38, qty: qty }];
  page.submit();
  return added === null && cleared === false &&
         page.data.toastText === '商品数量有误，请回购物车调整';
}
ok('小数 qty 1.5 被拒绝', rejectedWithQty(1.5) === true);
ok('qty 0 被拒绝', rejectedWithQty(0) === true);
ok('qty -2 被拒绝', rejectedWithQty(-2) === true);
ok('qty NaN 被拒绝', rejectedWithQty(NaN) === true);
ok('非法数量不会清空购物车', cleared === false);

// store.cartItems 渲染时会把 0 / 负数 / NaN 兜底成 1，
// 只校验渲染后的 items 会漏掉它们，所以结算页还要校验原始购物车。
function rejectedWithRawCartQty(qty) {
  app.globalData.cart = [{ key: 'zhentoumo', qty: qty }];
  page.onLoad();                 // 重新渲染：items 里的数量会被兜底成 1
  added = null;
  cleared = false;
  page.data.toastText = '';
  page.data.form = {
    name: '张三', phone: '13800138000', addr: '上海市黄浦区南京东路 1 号', note: '',
  };
  page.submit();
  return added === null && cleared === false &&
         page.data.toastText === '商品数量有误，请回购物车调整';
}
ok('原始购物车 qty 0（渲染后被兜底成 1）仍被拒绝',
   rejectedWithRawCartQty(0) === true);
ok('原始购物车 qty -2（渲染后被兜底成 1）仍被拒绝',
   rejectedWithRawCartQty(-2) === true);
ok('原始购物车 qty NaN（渲染后被兜底成 1）仍被拒绝',
   rejectedWithRawCartQty(NaN) === true);

// ============================================================
// ③ 我的订单页：旧订单兼容 + 不回写 Storage
// ============================================================
head('我的订单页 · 旧订单与 Storage');
let storageWrites = 0;
global.wx = {
  setStorageSync() { storageWrites++; },
  getStorageSync() { return null; },
};
app.globalData.orders = [oldOrder, newOrder];
global.Page = cfg => { capturedPage = cfg; };
delete require.cache[require.resolve(ORDERS_PAGE)];
require(ORDERS_PAGE);
const ordersPage = makePage(capturedPage);
ordersPage.onShow();

const shownOld = ordersPage.data.orders[0];
const shownNew = ordersPage.data.orders[1];
ok('旧订单只列商品名',
   shownOld.itemsText === '枕头馍 · 阜阳年味礼盒', shownOld.itemsText);
ok('旧订单 countText 为空', shownOld.countText === '', shownOld.countText);
ok('旧订单金额保持 226', shownOld.total === 226, shownOld.total);
ok('新订单显示「共 3 件」', shownNew.countText === '共 3 件', shownNew.countText);
ok('新订单带数量文本',
   shownNew.itemsText === '枕头馍 × 2 · 阜阳年味礼盒 × 1', shownNew.itemsText);
ok('渲染订单不回写 Storage', storageWrites === 0, storageWrites);

console.log();
console.log(fail === 0 ? '全部通过 ✅' : `${fail} 项失败 ❌`);
process.exit(fail === 0 ? 0 : 1);
