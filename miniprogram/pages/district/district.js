const { D, byDistrict } = require('../../data/catalog.js');

Page({
  data: { statusBarHeight: 20, d: null, list: [], giCount: 0, toastText: '' },

  onLoad(options) {
    const d = D(options.id);
    if (!d) {
      wx.showToast({ title: '这个县区还没收录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }
    const list = byDistrict(d.id);
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      d,
      list,
      giCount: list.filter(p => (p.badges || []).some(b => b[1] === 'gi')).length,
    });
  },

  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },
  goProduct(e) {
    wx.navigateTo({ url: '/pages/product/product?id=' + e.currentTarget.dataset.id });
  },
});
