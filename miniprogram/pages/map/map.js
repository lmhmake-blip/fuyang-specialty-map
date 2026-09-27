const { DISTRICTS, byDistrict } = require('../../data/catalog.js');

Page({
  data: { statusBarHeight: 20, districts: [] },
  onLoad() {
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      districts: DISTRICTS.map(d => ({
        id: d.id, name: d.name, color: d.color, hint: d.hint,
        count: byDistrict(d.id).length,
      })),
    });
  },
  goDistrict(e) {
    wx.navigateTo({ url: '/pages/district/district?id=' + e.currentTarget.dataset.id });
  },
});
