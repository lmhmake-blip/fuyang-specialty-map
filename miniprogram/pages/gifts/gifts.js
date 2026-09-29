const store = require('../../data/store.js');
const { toast } = require('../../utils/toast.js');

Page({
  data: { statusBarHeight: 20, boxes: [], toastText: '' },

  onLoad() {
    this.render();
    store.onUpdate(() => this.render());
  },

  render() {
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      boxes: store.allGiftboxes().map(g => Object.assign({}, g, {
        itemNames: g.items.map(id => (store.P(id) || {}).name).filter(Boolean),
      })),
    });
  },

  addBox(e) {
    const name = e.currentTarget.dataset.name;
    getApp().addToCart('box:' + name);
    toast(this, '已加入 · ' + name);
  },
});
