const store = require('../../data/store.js');

Page({
  data: { statusBarHeight: 20, d: null, list: [], giCount: 0, toastText: '' },

  onLoad(options) {
    this.did = options.id;
    if (!store.D(this.did)) {
      wx.showToast({ title: '这个县区还没收录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }
    this.render();
    this._onStore = () => this.render();
    store.onUpdate(this._onStore);
  },
  onUnload() { store.offUpdate(this._onStore); },

  render() {
    const d = store.D(this.did);
    // 云端数据里没有这个县区（比如下架了）→ 保留当前画面，不崩
    if (!d) return;

    const list = store.byDistrict(d.id).map(item => Object.assign({}, item, {
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
