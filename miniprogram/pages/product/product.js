const { P, D, byDistrict, cartItems } = require('../../data/catalog.js');
const { toast } = require('../../utils/toast.js');

Page({
  data: {
    statusBarHeight: 20, p: null, d: null, others: 0,
    heroFontSize: 84, cartCount: 0, toastText: '',
  },

  onLoad(options) {
    const p = P(options.id);
    if (!p) {
      wx.showToast({ title: '没找到这个商品', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }
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
      d: D(p.d),
      others: byDistrict(p.d).length - 1,
      heroFontSize: p.short.length <= 2 ? 84 : 64,
      cartCount: cartItems(app.globalData.cart).length,
    });
  },

  addCart() {
    const app = getApp();
    app.addToCart(this.data.p.id);
    this.setData({ cartCount: cartItems(app.globalData.cart).length });
    toast(this, '已加入礼盒 · ' + this.data.p.name);
  },
  goGifts() { wx.switchTab({ url: '/pages/gifts/gifts' }); },
  goDistrict() {
    wx.navigateTo({ url: '/pages/district/district?id=' + this.data.p.d });
  },
  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },
});
