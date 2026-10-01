const store = require('../../data/store.js');
const { toast } = require('../../utils/toast.js');

Page({
  data: {
    statusBarHeight: 20,
    items: [], total: 0, ship: 0, due: 0,
    shipWay: 0, payWay: 0,
    form: { name: '', phone: '', addr: '', note: '' },
    errors: { name: '', phone: '', addr: '' },
    toastText: '',
  },

  onLoad() {
    this.render();
    this._onStore = () => this.render();
    store.onUpdate(this._onStore);
  },
  onUnload() { store.offUpdate(this._onStore); },
  onShow() { this.render(); },

  render() {
    const app = getApp();
    const items = store.cartItems(app.globalData.cart);
    const total = store.cartTotal(app.globalData.cart);
    const ship = store.shipFee(total);
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      items, total, ship, due: total + ship,
    });
  },

  onInput(e) {
    const k = e.currentTarget.dataset.k;
    const form = Object.assign({}, this.data.form);
    form[k] = e.detail.value;
    const errors = Object.assign({}, this.data.errors);
    errors[k] = '';
    this.setData({ form, errors });
  },

  pickShip(e) { this.setData({ shipWay: Number(e.currentTarget.dataset.i) }); },
  pickPay(e) { this.setData({ payWay: Number(e.currentTarget.dataset.i) }); },

  submit() {
    const { name, phone, addr } = this.data.form;
    const errors = { name: '', phone: '', addr: '' };
    // 三个字段各自独立判断 —— 一次把填错的都标出来，用户不用提交三次才填完表。
    // （手机号内部保留 if/else if：空 与 格式错 是同一个字段的两种情况）
    if (!name.trim()) errors.name = '请填写收货人姓名';
    if (!phone.trim()) errors.phone = '请填写手机号';
    else if (!/^1[3-9]\d{9}$/.test(phone.trim())) errors.phone = '手机号格式不对，应为 11 位大陆号码';
    if (!addr.trim()) errors.addr = '请填写收货地址';

    if (errors.name || errors.phone || errors.addr) {
      this.setData({ errors });
      return;
    }
    if (!this.data.items.length) { toast(this, '清单是空的'); return; }

    const d = new Date();
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const no = 'FY' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate())
             + String(Math.floor(Math.random() * 9000) + 1000);
    const time = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate()
               + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());

    getApp().addOrder({
      no, time,
      name: name.trim(), phone: phone.trim(), addr: addr.trim(),
      total: this.data.due,
      items: this.data.items.map(i => ({ name: i.name, price: i.price })),
    });
    getApp().clearCart();
    // redirect：下单后返回不该回到结算页
    wx.redirectTo({ url: '/pages/orders/orders' });
  },

  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }); },
});
