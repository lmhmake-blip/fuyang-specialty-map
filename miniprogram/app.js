App({
  globalData: {
    // 购物车与订单暂存内存 + Storage 双写；等主体资质确定后，
    // 这里换成真实的下单接口，页面层不用动。
    cart: [],
    orders: [],
    statusBarHeight: 20,
    navBarHeight: 44,
  },

  onLaunch() {
    // 自定义导航栏要避开右上角胶囊
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const menu = wx.getMenuButtonBoundingClientRect();
      this.globalData.statusBarHeight = win.statusBarHeight || 20;
      this.globalData.navBarHeight = (menu.top - win.statusBarHeight) * 2 + menu.height;
    } catch (e) {
      this.globalData.statusBarHeight = 20;
      this.globalData.navBarHeight = 44;
    }

    try {
      this.globalData.cart = wx.getStorageSync('fy_cart') || [];
      this.globalData.orders = wx.getStorageSync('fy_orders') || [];
    } catch (e) {
      this.globalData.cart = [];
      this.globalData.orders = [];
    }
  },

  // ---- 购物车 ----
  addToCart(key) {
    this.globalData.cart.push(key);
    this.saveCart();
    return this.globalData.cart.length;
  },
  removeFromCart(key) {
    const i = this.globalData.cart.indexOf(key);
    if (i > -1) this.globalData.cart.splice(i, 1);
    this.saveCart();
  },
  clearCart() {
    this.globalData.cart = [];
    this.saveCart();
  },
  saveCart() {
    try { wx.setStorageSync('fy_cart', this.globalData.cart); } catch (e) {}
  },

  // ---- 订单 ----
  addOrder(order) {
    this.globalData.orders.unshift(order);
    try { wx.setStorageSync('fy_orders', this.globalData.orders); } catch (e) {}
  },
});
