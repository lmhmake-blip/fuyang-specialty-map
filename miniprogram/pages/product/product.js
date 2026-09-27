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
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      p,
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
