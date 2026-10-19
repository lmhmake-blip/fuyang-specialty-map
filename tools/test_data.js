#!/usr/bin/env node
/* ============================================================
   数据可信度测试（catalog.js）
   ============================================================
   这一版改的是「别把话说满」：
     - 企业礼盒降到 299，页面按单品现价算「单买 313 / 省 14」
     - 地理标志按 giName 去重（香椿酱与鲜香椿同源，只算 1 个）
     - 认证归属没核实前只标 certPending，不编证书编号/链接
     - 黄牛肉是「全国名特优新」，不再借用「地理标志」徽章

   断言全部写死字面量，不拿被测代码自己算期望值。
   用法：node tools/test_data.js
   ============================================================ */
const path = require('path');
const catalog = require(path.join(__dirname, '..', 'miniprogram', 'data', 'catalog.js'));

let fail = 0;
const ok = (name, cond, extra) => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra !== undefined ? '   → ' + extra : ''}`);
  if (!cond) fail++;
};
const head = t => console.log(`\n— ${t} —`);
const P = id => catalog.PRODUCTS.find(p => p.id === id);
const G = id => catalog.GIFT_BOXES.find(g => g.id === id);

head('基础数量');
ok('商品 22 款', catalog.PRODUCTS.length === 22, catalog.PRODUCTS.length);
ok('县区 8 个', catalog.DISTRICTS.length === 8, catalog.DISTRICTS.length);
ok('礼盒 3 个', catalog.GIFT_BOXES.length === 3, catalog.GIFT_BOXES.length);

head('企业年礼定价');
const qiye = G('gb-qiye');
ok('企业年礼售价 299', qiye.price === 299, qiye.price);
ok('划线价 313', qiye.was === 313, qiye.was);
ok('企业礼盒单品合计 313',
   qiye.items.reduce((s, id) => s + P(id).price, 0) === 313,
   qiye.items.reduce((s, id) => s + P(id).price, 0));
ok('省 14 元', 313 - qiye.price === 14, 313 - qiye.price);
ok('礼盒价不高于单品合计', qiye.price <= 313, qiye.price + ' <= 313');

head('所有礼盒：定价不高于单品合计');
catalog.GIFT_BOXES.forEach(g => {
  const sum = g.items.reduce((s, id) => s + P(id).price, 0);
  ok(`${g.name}：${g.price} <= ${sum}`, g.price <= sum, `单买合计 ${sum}`);
});
ok('年味礼盒单买合计 197',
   G('gb-nianwei').items.reduce((s, id) => s + P(id).price, 0) === 197);
ok('尝鲜礼盒单买合计 118',
   G('gb-tuan').items.reduce((s, id) => s + P(id).price, 0) === 118);

head('地理标志按 giName 归属');
ok('香椿酱 giName = 太和香椿', P('chunya').giName === '太和香椿', P('chunya').giName);
ok('鲜香椿 giName = 太和香椿', P('chunya-fresh').giName === '太和香椿', P('chunya-fresh').giName);
ok('草莓 giName = 闻集草莓', P('caomei').giName === '闻集草莓', P('caomei').giName);
ok('马铃薯 giName = 界首马铃薯', P('malingshu').giName === '界首马铃薯', P('malingshu').giName);
ok('4 款商品带 giName',
   catalog.PRODUCTS.filter(p => p.giName).length === 4,
   catalog.PRODUCTS.filter(p => p.giName).map(p => p.id).join(','));
ok('giName 去重后是 3 个地标',
   Array.from(new Set(catalog.PRODUCTS.filter(p => p.giName).map(p => p.giName))).length === 3,
   Array.from(new Set(catalog.PRODUCTS.filter(p => p.giName).map(p => p.giName))).join(','));
ok('黄牛肉不挂 giName', !P('huangniurou').giName);

head('认证归属待核实');
ok('5 款标 certPending',
   catalog.PRODUCTS.filter(p => p.certPending).map(p => p.id).sort().join(',') ===
   'caomei,chunya,chunya-fresh,huangniurou,malingshu',
   catalog.PRODUCTS.filter(p => p.certPending).map(p => p.id).join(','));
ok('没有编造证书编号 / 链接',
   catalog.PRODUCTS.every(p => p.certNo === undefined && p.certUrl === undefined && p.certLink === undefined));

head('徽章归属');
ok('香椿酱徽章 = 国家地理标志原料',
   P('chunya').badges[0][0] === '国家地理标志原料', P('chunya').badges[0][0]);
ok('香椿酱徽章样式 = gi', P('chunya').badges[0][1] === 'gi', P('chunya').badges[0][1]);
ok('黄牛肉徽章 = 全国名特优新',
   P('huangniurou').badges[0][0] === '全国名特优新', P('huangniurou').badges[0][0]);
ok('黄牛肉徽章样式 = new', P('huangniurou').badges[0][1] === 'new', P('huangniurou').badges[0][1]);
ok('黄牛肉不再是 gi 徽章', P('huangniurou').badges.every(b => b[1] !== 'gi'));

head('县区页 · giName 统计口径');
// district.js 是页面文件，require 时会调用 Page()；打个桩拿到页面配置，
// 并直接验证它导出的统计函数（不依赖真实小程序运行时）。
global.Page = () => {};
global.getApp = () => ({ globalData: { statusBarHeight: 20 } });
global.wx = {
  showToast: () => {}, navigateBack: () => {}, navigateTo: () => {}, switchTab: () => {},
};
const { giNamesOf } = require(path.join(__dirname, '..', 'miniprogram', 'pages', 'district', 'district.js'));

ok('giName 带前后空格时先 trim 再去重（只算 1 个）',
   giNamesOf([{ giName: ' 太和香椿 ' }, { giName: '太和香椿' }]).join(',') === '太和香椿',
   giNamesOf([{ giName: ' 太和香椿 ' }, { giName: '太和香椿' }]).join(','));
ok('giName 是空字符串 / 纯空格时不算',
   giNamesOf([{ giName: '' }, { giName: '   ' }, {}]).length === 0,
   giNamesOf([{ giName: '' }, { giName: '   ' }, {}]).length);
ok('空值混在有效值里时只统计有效项',
   giNamesOf([{ giName: ' 闻集草莓 ' }, { giName: '' }]).join(',') === '闻集草莓',
   giNamesOf([{ giName: ' 闻集草莓 ' }, { giName: '' }]).join(','));

console.log();
console.log(fail === 0 ? '全部通过 ✅' : `${fail} 项失败 ❌`);
process.exit(fail === 0 ? 0 : 1);
