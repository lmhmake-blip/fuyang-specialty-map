const store = require('../../data/store.js');

Page({
  data: { statusBarHeight: 20, districts: [] },

  onLoad() {
    this.render();
    this._onStore = () => this.render();
    store.onUpdate(this._onStore);
  },
  onUnload() { store.offUpdate(this._onStore); },

  render() {
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      districts: store.allDistricts().map(d => ({
        id: d.id, name: d.name, color: d.color, hint: d.hint,
        count: store.byDistrict(d.id).length,
      })),
    });
  },

  goDistrict(e) {
    wx.navigateTo({ url: '/pages/district/district?id=' + e.currentTarget.dataset.id });
  },
});
