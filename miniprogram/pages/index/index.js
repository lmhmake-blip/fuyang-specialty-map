const store = require('../../data/store.js');

const PICK_IDS = ['sanzi', 'chunya', 'huangniurou', 'caomei', 'zhentoumo', 'jiecai'];

Page({
  data: {
    statusBarHeight: 20,
    districts: [],
    picks: [],
    productCount: 0,
  },

  onLoad() {
    this.render();
    // 云端数据到达后重渲染一次。数据没变时 setData 是空操作，看不到闪烁。
    store.onUpdate(() => this.render());
  },

  render() {
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      // 县区色块里直接放完整地名，不做单字抽头
      districts: store.allDistricts().map(d => ({
        id: d.id, name: d.name, color: d.color, hint: d.hint,
        count: store.byDistrict(d.id).length,
      })),
      picks: PICK_IDS.map(id => store.P(id)).filter(Boolean),
      productCount: store.allProducts().length,
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
