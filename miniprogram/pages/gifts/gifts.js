Page({
  data: { statusBarHeight: 20 },
  onLoad() {
    this.setData({ statusBarHeight: getApp().globalData.statusBarHeight });
  },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }); },
});
