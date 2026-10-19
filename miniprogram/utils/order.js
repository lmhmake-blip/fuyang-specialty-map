/* ============================================================
   订单快照 · 纯函数
   ============================================================
   购物车条目（含 key / 颜色等展示字段）和订单条目不是一回事：
   订单一旦提交就应该冻结当时的名称、单价与数量，后续商品改价、
   下架都不能影响历史订单。

   这里只做「购物车 → 订单快照」和「订单 → 展示文本/金额」，
   不碰 Storage、不碰页面，方便在 Node 里直接测。
   ============================================================ */

// 数量规则：
//   没有 qty 字段（旧订单）→ 按 1 件算，兼容历史数据
//   qty 存在但不是正整数（小数 / 0 / 负数 / NaN / 非数字）→ 返回 null，表示非法
// 提交前用 hasInvalidQty 拦下非法数量，不要让它进订单。
function qtyOf(item) {
  if (!item || item.qty === undefined || item.qty === null) return 1;
  const qty = item.qty;
  if (typeof qty !== 'number' || !isFinite(qty) || qty <= 0 || qty % 1 !== 0) return null;
  return qty;
}

// 数量是否非法（缺 qty 的旧订单不算非法）。
function hasInvalidQty(items) {
  return (items || []).some(item => qtyOf(item) === null);
}

// 购物车条目 -> 订单条目。只留下订单要用的字段。
// 非法数量照实标成 null、小计记 0；正常提交路径会先被 hasInvalidQty 拦下。
function snapshotItems(items) {
  return (items || []).map(item => {
    const qty = qtyOf(item);
    return {
      key: item.key,
      name: item.name,
      price: item.price,
      qty: qty,
      subtotal: qty === null ? 0 : item.price * qty,
    };
  });
}

// 商品金额（不含运费）。旧条目无 qty 时每件按 1 件算。
function itemsTotal(items) {
  return (items || []).reduce((sum, item) => {
    const qty = qtyOf(item);
    return sum + (qty === null ? 0 : (item.price || 0) * qty);
  }, 0);
}

// 件数 = 数量之和，不是行数。
function itemCount(items) {
  return (items || []).reduce((sum, item) => {
    const qty = qtyOf(item);
    return sum + (qty === null ? 0 : qty);
  }, 0);
}

// 旧订单没有 count 字段 —— 不知道当时买了几件，就不显示「共 N 件」，
// 不能拿现在的 items 瞎猜一个数字。
function displayCount(order) {
  const n = order && order.count;
  return n > 0 ? '共 ' + n + ' 件' : '';
}

// 新订单显示「名称 × 数量」；旧订单没有 qty，只列商品名，
// 不补一个假的「× 1」。
function itemsText(order) {
  const items = (order && order.items) || [];
  const withQty = !!(order && order.count > 0);
  return items.map(item => {
    const qty = qtyOf(item);
    return withQty && qty !== null ? item.name + ' × ' + qty : item.name;
  }).join(' · ');
}

module.exports = { qtyOf, hasInvalidQty, snapshotItems, itemsTotal, itemCount, displayCount, itemsText };
