const store = require('../../data/store.js');
const { toast } = require('../../utils/toast.js');

Page({
  data: { statusBarHeight: 20, items: [], total: 0, toastText: '' },

  onLoad() {
    this.render();
    store.onUpdate(() => this.render());
  },
  onShow() { this.render(); },

  render() {
    const app = getApp();
    const items = store.cartItems(app.globalData.cart);
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      items,
      total: items.reduce((s, i) => s + i.price, 0),
    });
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
