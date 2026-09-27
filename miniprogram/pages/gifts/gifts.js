const { GIFT_BOXES, P } = require('../../data/catalog.js');
const { toast } = require('../../utils/toast.js');

Page({
  data: { statusBarHeight: 20, boxes: [], toastText: '' },

  onLoad() {
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      boxes: GIFT_BOXES.map(g => Object.assign({}, g, {
        itemNames: g.items.map(id => (P(id) || {}).name).filter(Boolean),
      })),
    });
  },

  addBox(e) {
    const name = e.currentTarget.dataset.name;
    getApp().addToCart('box:' + name);
    toast(this, '已加入 · ' + name);
  },
});
