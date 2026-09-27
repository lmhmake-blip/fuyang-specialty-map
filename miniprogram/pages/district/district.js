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
    const list = byDistrict(d.id).map(item => Object.assign({}, item, {
      badges: (item.badges || []).map((b, i) => ({ t: b[0], c: b[1], key: 'bd' + i })),
    }));
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      d: Object.assign({}, d, {
        stats: (d.stats || []).map((st, i) => ({ k: st[0], v: st[1], key: 'st' + i })),
      }),
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
