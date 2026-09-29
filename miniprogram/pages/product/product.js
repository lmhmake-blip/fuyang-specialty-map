const store = require('../../data/store.js');
const { toast } = require('../../utils/toast.js');

Page({
  data: {
    statusBarHeight: 20, p: null, d: null, others: 0,
    heroFontSize: 84, cartCount: 0, toastText: '',
  },

  onLoad(options) {
    this.pid = options.id;
    if (!store.P(this.pid)) {
      wx.showToast({ title: '没找到这个商品', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }
    this.render();
    store.onUpdate(() => this.render());
  },

  render() {
    const p = store.P(this.pid);
    // 云端数据里没有这个商品（比如已下架删除）→ 保留当前画面，不崩
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
      cartCount: store.cartItems(app.globalData.cart).length,
    });
  },

  addCart() {
    const app = getApp();
    app.addToCart(this.data.p.id);
    this.setData({ cartCount: store.cartItems(app.globalData.cart).length });
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
