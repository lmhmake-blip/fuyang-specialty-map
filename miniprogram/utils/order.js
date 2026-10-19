/* ============================================================
   订单快照 · 纯函数
   ============================================================
   购物车条目（含 key / 颜色等展示字段）和订单条目不是一回事：
   订单一旦提交就应该冻结当时的名称、单价与数量，后续商品改价、
   下架都不能影响历史订单。

   这里只做「购物车 → 订单快照」和「订单 → 展示文本/金额」，
   不碰 Storage、不碰页面，方便在 Node 里直接测。
   ============================================================ */

// 数量兜底：旧订单没有 qty 字段，按 1 件算。
function qtyOf(item) {
  return item && item.qty > 0 ? item.qty : 1;
}

// 购物车条目 -> 订单条目。只留下订单要用的字段。
function snapshotItems(items) {
  return (items || []).map(item => {
    const qty = qtyOf(item);
    return {
      key: item.key,
      name: item.name,
      price: item.price,
      qty: qty,
      subtotal: item.price * qty,
    };
  });
}

// 商品金额（不含运费）。旧条目无 qty 时每件按 1 件算。
function itemsTotal(items) {
  return (items || []).reduce((sum, item) => {
    return sum + (item.price || 0) * qtyOf(item);
  }, 0);
}

// 件数 = 数量之和，不是行数。
function itemCount(items) {
  return (items || []).reduce((sum, item) => sum + qtyOf(item), 0);
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
    return withQty ? item.name + ' × ' + qtyOf(item) : item.name;
  }).join(' · ');
}

module.exports = { snapshotItems, itemsTotal, itemCount, displayCount, itemsText };
