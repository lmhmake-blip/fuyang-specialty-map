const store = require('../../data/store.js');

Page({
  data: { statusBarHeight: 20, cartCount: 0, cartTotal: 0, orderCount: 0 },

  onLoad() {
    this.render();
    this._onStore = () => this.render();
    store.onUpdate(this._onStore);
  },
  onUnload() { store.offUpdate(this._onStore); },
  // 用 onShow：从购物车/订单返回时要刷新计数
  onShow() { this.render(); },

  render() {
    const app = getApp();
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      cartCount: store.cartCount(app.globalData.cart),
      cartTotal: store.cartTotal(app.globalData.cart),
      orderCount: app.globalData.orders.length,
    });
  },

  goCart() { wx.navigateTo({ url: '/pages/cart/cart' }); },
  goOrders() { wx.navigateTo({ url: '/pages/orders/orders' }); },
  goAbout() { wx.navigateTo({ url: '/pages/about/about' }); },
  goMap() { wx.switchTab({ url: '/pages/map/map' }); },
});
