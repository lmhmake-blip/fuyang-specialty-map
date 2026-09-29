const store = require('../../data/store.js');

Page({
  data: { statusBarHeight: 20, districts: [] },

  onLoad() {
    this.render();
    store.onUpdate(() => this.render());
  },

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
