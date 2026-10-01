const store = require('../../data/store.js');
const { toast } = require('../../utils/toast.js');

Page({
  data: { statusBarHeight: 20, items: [], totalQty: 0, total: 0, toastText: '' },

  onLoad() {
    this.render();
    this._onStore = () => this.render();
    store.onUpdate(this._onStore);
  },
  onUnload() { store.offUpdate(this._onStore); },
  onShow() { this.render(); },

  render() {
    const app = getApp();
    const items = store.cartItems(app.globalData.cart);
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      items,
      totalQty: store.cartCount(app.globalData.cart),
      total: store.cartTotal(app.globalData.cart),
    });
  },

  // 步进器 + / −。减到 1 就停住，不再往下 ——
  // 避免手滑把东西减没。要清掉请点「移除」。
  inc(e) {
    const key = e.currentTarget.dataset.key;
    const it = this.data.items.find(i => i.key === key);
    if (!it) return;
    getApp().setQty(key, it.qty + 1);
    this.render();
  },
  dec(e) {
    const key = e.currentTarget.dataset.key;
    const it = this.data.items.find(i => i.key === key);
    if (!it || it.qty <= 1) return;
    getApp().setQty(key, it.qty - 1);
    this.render();
  },

  remove(e) {
    getApp().removeFromCart(e.currentTarget.dataset.key);
    this.render();
    toast(this, '已移除');
  },
  goCheckout() { wx.navigateTo({ url: '/pages/checkout/checkout' }); },
  goMap() { wx.switchTab({ url: '/pages/map/map' }); },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }); },
});
