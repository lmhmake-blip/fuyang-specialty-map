/* ============================================================
   云开发环境 ID
   ⚠️ 迁移到企业号时，只需改动这一个常量
      （见桌面《阜阳特产小程序-企业号迁移手册》步骤 3）
   ============================================================ */
const CLOUD_ENV = 'cloud1-d5gc3nde3316fee1c';

const store = require('./data/store.js');

App({
  globalData: {
    // 购物车与订单暂存内存 + Storage 双写；等主体资质确定后，
    // 这里换成真实的下单接口，页面层不用动。
    cart: [],
    orders: [],
    cloudReady: false,   // 云开发是否初始化成功（取数层会用它决定走云端还是兜底）
    statusBarHeight: 20,
    navBarHeight: 44,
  },

  onLaunch() {
    this.initCloud();
    // 取数层：先同步读缓存（页面 onLoad 时数据已就绪，不白屏），
    // 再异步拉云端，拿到后更新内存并通知已订阅的页面。
    // 包 try：取数层出任何问题都应降级到内置数据，绝不能拖垮整个 App
    try {
      store.init();
    } catch (e) {
      console.error('[store] 初始化失败，本次运行使用内置数据', e);
    }

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

  // ---- 云开发 ----
  initCloud() {
    if (!wx.cloud) {
      console.error('[云开发] 当前基础库不支持云能力，请在开发者工具里把调试基础库调到 2.2.3 以上');
      return;
    }
    try {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: true });
      this.globalData.cloudReady = true;
    } catch (e) {
      // 初始化失败不阻断页面：取数层会退回本地内置数据（data/catalog.js）
      console.error('[云开发] 初始化失败', e);
      this.globalData.cloudReady = false;
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
