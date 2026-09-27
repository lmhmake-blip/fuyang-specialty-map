const { cartItems, cartTotal } = require('../../data/catalog.js');

Page({
  data: { statusBarHeight: 20, cartCount: 0, cartTotal: 0, orderCount: 0 },

  // 用 onShow：从购物车/订单返回时要刷新计数
  onShow() {
    const app = getApp();
    const items = cartItems(app.globalData.cart);
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      cartCount: items.length,
      cartTotal: cartTotal(app.globalData.cart),
      orderCount: app.globalData.orders.length,
    });
  },

  goCart() { wx.navigateTo({ url: '/pages/cart/cart' }); },
  goOrders() { wx.navigateTo({ url: '/pages/orders/orders' }); },
  goAbout() { wx.navigateTo({ url: '/pages/about/about' }); },
  goMap() { wx.switchTab({ url: '/pages/map/map' }); },
});
