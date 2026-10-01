const store = require('../../data/store.js');
const { toast } = require('../../utils/toast.js');

// 这个商品在清单里已经有几件（0 表示还没加过）
function inCartQty(cart, key) {
  const line = (cart || []).find(l => l && l.key === key);
  return line && line.qty > 0 ? line.qty : 0;
}

Page({
  data: {
    statusBarHeight: 20, p: null, d: null, others: 0,
    heroFontSize: 84,
    inCart: 0,     // 本商品在清单里已有几件 —— 步进器显示的就是这个数
    toastText: '',
  },

  onLoad(options) {
    this.pid = options.id;
    // store.P() 刻意返回全量（购物车算钱要用已下架的），
    // 所以「能不能看详情」这件事得详情页自己挡：已下架 == 不给看
    const raw = store.P(this.pid);
    if (!raw || raw.onSale === false) {
      wx.showToast({ title: raw ? '这个商品已下架' : '没找到这个商品', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }
    this.render();
    this._onStore = () => this.render();
    store.onUpdate(this._onStore);
  },
  onUnload() { store.offUpdate(this._onStore); },

  render() {
    const raw = store.P(this.pid);
    const p = (raw && raw.onSale !== false) ? raw : null;
    // 商品被删除、或改成下架 → 保留当前画面，不崩
    if (!p) return;

    const app = getApp();
    // 列表项预加唯一 key —— wx:key="index" 不是合法值，item 里并没有 index 属性
    const view = Object.assign({}, p, {
      badges: (p.badges || []).map((b, i) => ({ t: b[0], c: b[1], key: 'bd' + i })),
      specs: (p.specs || []).map((sp, i) => ({ k: sp[0], v: sp[1], key: 'sp' + i })),
      evidence: (p.evidence || []).map((e, i) => ({ t: e.t, b: e.b, key: 'ev' + i })),
    });
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      p: view,
      d: store.D(p.d),
      others: store.byDistrict(p.d).length - 1,
      heroFontSize: p.short.length <= 2 ? 84 : 64,
      inCart: inCartQty(app.globalData.cart, p.id),
    });
  },

  // 步进器 = 清单里这个商品的数量。点一下立刻生效，不是「待加入数量」。
  // （原来做成「先选件数、再点加入」两步，页面上还有个「清单里已有 N 件」，
  //   两个数字互相打架，而且 + 点了没反应 —— 看着就是个摆设。）
  incCart() {
    const app = getApp();
    const was = this.data.inCart;
    app.addToCart(this.data.p.id, 1);
    this.setData({ inCart: inCartQty(app.globalData.cart, this.data.p.id) });
    // 只在「第一次加入」时提示一下；之后连点 + 不该每次都弹
    if (was === 0) toast(this, '已加入 · ' + this.data.p.name);
  },
  decCart() {
    const n = this.data.inCart;
    if (n <= 1) return;          // 减到 1 停住，手别滑；要清空请去清单里点「移除」
    const app = getApp();
    app.setQty(this.data.p.id, n - 1);
    this.setData({ inCart: inCartQty(app.globalData.cart, this.data.p.id) });
  },

  goCart() { wx.navigateTo({ url: '/pages/cart/cart' }); },
  goGifts() { wx.switchTab({ url: '/pages/gifts/gifts' }); },
  goDistrict() {
    wx.navigateTo({ url: '/pages/district/district?id=' + this.data.p.d });
  },
  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },
});
