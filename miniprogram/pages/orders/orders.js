Page({
  data: { statusBarHeight: 20, orders: [] },

  onShow() {
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      orders: getApp().globalData.orders.map(o => Object.assign({}, o, {
        itemsText: (o.items || []).map(i => i.name).join(' · '),
      })),
    });
  },
  goGifts() { wx.switchTab({ url: '/pages/gifts/gifts' }); },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }); },
});
