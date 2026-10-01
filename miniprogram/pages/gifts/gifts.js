const store = require('../../data/store.js');
const { toast } = require('../../utils/toast.js');

Page({
  data: { statusBarHeight: 20, boxes: [], boxCount: 0, priceFrom: '', priceTo: '', toastText: '' },

  onLoad() {
    this.render();
    this._onStore = () => this.render();
    store.onUpdate(this._onStore);
  },
  onUnload() { store.offUpdate(this._onStore); },

  render() {
    const boxes = store.allGiftboxes().map(g => Object.assign({}, g, {
      itemNames: g.items.map(id => (store.P(id) || {}).name).filter(Boolean),
    }));
    // 档数与价格区间跟着数据走 —— 文案里写死的「99 / 358」商家一改价就对不上了
    const prices = boxes.map(b => b.price).filter(p => typeof p === 'number');
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      boxes,
      boxCount: boxes.length,
      priceFrom: prices.length ? Math.min.apply(null, prices) : '',
      priceTo: prices.length ? Math.max.apply(null, prices) : '',
    });
  },

  addBox(e) {
    const name = e.currentTarget.dataset.name;
    getApp().addToCart('box:' + name);
    toast(this, '已加入 · ' + name);
  },
});
