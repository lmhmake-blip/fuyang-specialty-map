const store = require('../../data/store.js');

// 地理标志按 giName 去重：太和香椿酱与鲜香椿用的是同一个原料地标，只算 1 个。
// 不按徽章数：香椿酱是「国家地理标志原料」、黄牛肉是「全国名特优新」，
// 都不应被当成新增的地理标志。
function giNamesOf(list) {
  const seen = {};
  (list || []).forEach(p => { if (p.giName) seen[p.giName] = true; });
  return Object.keys(seen);
}

// 县区 stats 里的「地理标志 N 个」跟着实际商品数据走，
// 避免改了一批商品、页面上的数字还是旧的。
function statsWithGi(stats, giCount) {
  const out = [];
  let replaced = false;
  (stats || []).forEach(st => {
    if (st[0] !== '地理标志') { out.push(st); return; }
    replaced = true;
    if (giCount) out.push(['地理标志', giCount + ' 个']);
  });
  if (!replaced && giCount) out.splice(1, 0, ['地理标志', giCount + ' 个']);
  return out;
}

Page({
  data: { statusBarHeight: 20, d: null, list: [], giCount: 0, toastText: '' },

  onLoad(options) {
    this.did = options.id;
    if (!store.D(this.did)) {
      wx.showToast({ title: '这个县区还没收录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }
    this.render();
    this._onStore = () => this.render();
    store.onUpdate(this._onStore);
  },
  onUnload() { store.offUpdate(this._onStore); },

  render() {
    const d = store.D(this.did);
    // 云端数据里没有这个县区（比如下架了）→ 保留当前画面，不崩
    if (!d) return;

    const list = store.byDistrict(d.id).map(item => Object.assign({}, item, {
      badges: (item.badges || []).map((b, i) => ({ t: b[0], c: b[1], key: 'bd' + i })),
    }));
    const giCount = giNamesOf(list).length;
    this.setData({
      statusBarHeight: getApp().globalData.statusBarHeight,
      d: Object.assign({}, d, {
        stats: statsWithGi(d.stats, giCount).map((st, i) => ({ k: st[0], v: st[1], key: 'st' + i })),
      }),
      list,
      giCount,
    });
  },

  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },
  goProduct(e) {
    wx.navigateTo({ url: '/pages/product/product?id=' + e.currentTarget.dataset.id });
  },
});
