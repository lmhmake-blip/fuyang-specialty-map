const { DISTRICTS, PRODUCTS, byDistrict } = require('../../data/catalog.js');

const PICK_IDS = ['sanzi', 'chunya', 'huangniurou', 'caomei', 'zhentoumo', 'jiecai'];

Page({
  data: {
    statusBarHeight: 20,
    districts: [],
    picks: [],
    productCount: 0,
  },

  onLoad() {
    const app = getApp();
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      // 县区色块里直接放完整地名，不做单字抽头
      districts: DISTRICTS.map(d => ({
        id: d.id, name: d.name, color: d.color, hint: d.hint,
        count: byDistrict(d.id).length,
      })),
      picks: PICK_IDS.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean),
      productCount: PRODUCTS.length,
    });
  },

  goDistrict(e) {
    wx.navigateTo({ url: '/pages/district/district?id=' + e.currentTarget.dataset.id });
  },
  goProduct(e) {
    wx.navigateTo({ url: '/pages/product/product?id=' + e.currentTarget.dataset.id });
  },
  goMap() { wx.switchTab({ url: '/pages/map/map' }); },
  goGifts() { wx.switchTab({ url: '/pages/gifts/gifts' }); },
});
