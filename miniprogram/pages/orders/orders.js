const order = require('../../utils/order.js');

Page({
  data: { statusBarHeight: 20, orders: [] },

  onShow() {
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      // 只在这里做展示转换，不回写 Storage ——
      // 旧订单缺 qty 是历史事实，补进去反而会改坏原始数据。
      orders: getApp().globalData.orders.map(o => Object.assign({}, o, {
        itemsText: order.itemsText(o),
        countText: order.displayCount(o),
        // 理论上旧订单也存了 total；万一缺失，按每件 1 件兜底
        total: o.total != null ? o.total : order.itemsTotal(o.items) + (o.ship || 0),
      })),
    });
  },
  goGifts() { wx.switchTab({ url: '/pages/gifts/gifts' }); },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }); },
});
