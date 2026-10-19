#!/usr/bin/env node
/* ============================================================
   store.js 冒烟测试
   store.js 是给小程序用的，但把小程序全局的 wx 打个桩，
   就能在 Node 里把两条路径都跑一遍：
     场景一：没有云能力      → 应该退回内置数据（降级路径）
     场景二：云数据库正常     → 应该覆盖内存 + 通知页面（主路径）
   改页面之前先跑这个，能挡住大部分低级错误。

   用法：node tools/test_store.js
   ============================================================ */
const path = require('path');
const STORE = path.join(__dirname, '..', 'miniprogram', 'data', 'store.js');
const CATALOG = path.join(__dirname, '..', 'miniprogram', 'data', 'catalog.js');

let fail = 0;
const ok = (name, cond, extra) => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra !== undefined ? '   → ' + extra : ''}`);
  if (!cond) fail++;
};
const head = t => console.log(`\n— ${t} —`);

// 每次重新 require，避免模块级状态串味
function freshStore() {
  delete require.cache[require.resolve(STORE)];
  delete require.cache[require.resolve(CATALOG)];
  return require(STORE);
}

// 假云数据库：支持 orderBy/skip/limit，用来验证分页
function cloudStub(docs) {
  return {
    database: () => ({
      collection: name => {
        const all = docs[name] || [];
        let _skip = 0, _limit = 20;
        const q = {
          orderBy: () => q,
          skip: n => { _skip = n; return q; },
          limit: n => { _limit = n; return q; },
          get: () => Promise.resolve({ data: all.slice(_skip, _skip + _limit) }),
        };
        return q;
      },
    }),
  };
}

(async function main() {
  // ================= 场景一：没有云能力 =================
  global.wx = { getStorageSync: () => null, setStorageSync: () => {} };
  let store = freshStore();
  store.init();

  head('场景一 · 降级路径（无云能力）');
  let info = store.info();
  ok('来源是 builtin', info.source === 'builtin', info.source);
  ok('商品 22 条', info.counts.products === 22, info.counts.products);
  ok('县区 8 条', info.counts.districts === 8, info.counts.districts);
  ok('礼盒 3 条', info.counts.giftboxes === 3, info.counts.giftboxes);
  ok('P(id) 查得到', store.P('zhentoumo') && store.P('zhentoumo').name === '枕头馍');
  ok('P(不存在) 返回 undefined', store.P('nope') === undefined);
  ok('D(id) 查得到', store.D('yingzhou') && store.D('yingzhou').name === '颍州区');

  const yz = store.byDistrict('yingzhou');
  ok('byDistrict 只返回该县区商品', yz.length > 0 && yz.every(p => p.d === 'yingzhou'), yz.length + ' 款');
  ok('byDistrict 保留原顺序', yz[0].id === 'zhentoumo');

  const cart = [{ key: 'zhentoumo', qty: 1 }, { key: 'box:阜阳年味礼盒', qty: 1 }];
  ok('cartItems 商品+礼盒都能解析', store.cartItems(cart).length === 2);
  ok('cartItems 丢弃无效 key', store.cartItems([{ key: 'nope', qty: 1 }, {}]).length === 0);
  ok('cartTotal = 38 + 188', store.cartTotal(cart) === 226, store.cartTotal(cart));

  // —— 数量：同一商品合并成一行后，钱与件数都要按数量算 ——
  const cart2 = [{ key: 'zhentoumo', qty: 3 }, { key: 'box:阜阳年味礼盒', qty: 2 }];
  ok('cartItems 带 qty / subtotal',
     store.cartItems(cart2)[0].qty === 3 && store.cartItems(cart2)[0].subtotal === 114,
     store.cartItems(cart2)[0].subtotal);
  ok('cartTotal 按数量算（38×3 + 188×2）', store.cartTotal(cart2) === 490, store.cartTotal(cart2));
  ok('cartCount 是件数之和，不是行数', store.cartCount(cart2) === 5, store.cartCount(cart2));

  // —— 兼容 Storage 里可能残留的老格式（字符串数组）——
  ok('兼容老格式字符串数组',
     store.cartItems(['zhentoumo']).length === 1 &&
     store.cartCount(['zhentoumo', 'zhentoumo']) === 2,
     store.cartCount(['zhentoumo', 'zhentoumo']));

  ok('shipFee 满 199 免运费', store.shipFee(226) === 0);
  ok('shipFee 不满收 12', store.shipFee(38) === 12);

  // ================= 场景二：云端正常 =================
  // 构造云端数据：id 换成 _id（验证归一化）、灌满 22 条（验证分页）、
  // 把「焦馍」标成已下架（验证过滤）、把顺序打乱（验证 sort）。
  // 同时删掉 giName / certPending —— 模拟云端还是旧 seed，
  // store 应该用内置数据把这两个新字段补齐。
  const catalog = require(CATALOG);
  const src = catalog.PRODUCTS;
  const cloudProducts = src.map((p, i) => {
    const o = Object.assign({}, p);
    delete o.id;
    delete o.giName;
    delete o.certPending;
    o._id = p.id;
    o.sort = (i + 1) * 10;              // 按原始次序给 sort
    o.onSale = p.id !== 'jiaomo';
    // 旧 seed 的错误值：黄牛肉误用 gi 样式、香椿酱把「原料」写成「产品」
    if (p.id === 'huangniurou') o.badges = [['全国名特优新', 'gi']];
    if (p.id === 'chunya') o.badges = [['国家地理标志', 'gi']];
    // 清单以外的云端改动必须保留（商家后来改的徽章）
    if (p.id === 'sanzi') o.badges = [['市级非遗', 'heritage'], ['手工盘条', 'heritage']];
    // 云端已有的值必须保留（价格由商家在后台改，不能被内置数据覆盖）
    if (p.id === 'zhentoumo') o.price = 999;
    return o;
  });
  cloudProducts.reverse();              // 灌进去时把顺序打乱，模拟数据库不保证顺序
  const cloudDistricts = catalog.DISTRICTS.map((d, i) => {
    const o = Object.assign({}, d); delete o.id;
    o._id = d.id; o.sort = (i + 1) * 10; return o;
  });

  global.wx = {
    getStorageSync: () => null,
    setStorageSync: () => {},
    cloud: cloudStub({ products: cloudProducts, districts: cloudDistricts, giftboxes: [] }),
  };

  store = freshStore();
  let notified = 0;
  store.onUpdate(() => { notified++; });
  store.init();

  ok('init 后立刻能同步读到数据（不白屏）', store.allProducts().length === 22,
     store.allProducts().length + ' 条 · 来源 ' + store.info().source);

  await new Promise(r => setTimeout(r, 30));   // 等云端 promise 落地

  head('场景二 · 云端路径');
  info = store.info();
  ok('来源切换为 cloud', info.source === 'cloud', info.source);
  ok('22 条全部拿到（分页生效，没被 20 条上限截断）',
     store.allProducts().length === 21, `22 条中 1 条已下架 → 展示 ${store.allProducts().length} 条`);
  ok('已下架商品不出现在展示列表',
     !store.allProducts().some(p => p.id === 'jiaomo'));
  ok('已下架商品仍可被 P() 查到（购物车里还能结算）',
     !!store.P('jiaomo'));
  ok('_id 已归一化成 id', store.allProducts()[0].id !== undefined);
  const shown = store.allProducts().filter(p => p.id !== 'jiaomo');
  ok('按 sort 排序（云端打乱灌入，展示应回到原始次序）',
     shown.map(p => p.id).join() === src.filter(p => p.id !== 'jiaomo').map(p => p.id).join(),
     '首条 ' + shown[0].id + ' · 与 catalog 原始次序一致');
  ok('更新通知触发了一次', notified === 1, notified + ' 次');
  ok('县区也从云端覆盖了', store.allDistricts().length === 8);
  ok('礼盒云端为空时不覆盖（保留内置）', store.allGiftboxes().length === 3);

  head('场景二 · 云端旧数据补齐');
  ok('缺 giName 时从内置补齐（香椿酱）',
     store.P('chunya').giName === '太和香椿', store.P('chunya').giName);
  ok('缺 giName 时从内置补齐（鲜香椿）',
     store.P('chunya-fresh').giName === '太和香椿', store.P('chunya-fresh').giName);
  ok('缺 certPending 时从内置补齐（黄牛肉）',
     store.P('huangniurou').certPending === true, store.P('huangniurou').certPending);
  ok('云端已有字段不被覆盖（枕头馍价格仍为 999）',
     store.P('zhentoumo').price === 999, store.P('zhentoumo').price);

  head('场景二 · 已知错误值纠正');
  ok('黄牛肉旧徽章 [全国名特优新, gi] 纠正为 [全国名特优新, new]',
     store.P('huangniurou').badges.length === 1 &&
     store.P('huangniurou').badges[0][0] === '全国名特优新' &&
     store.P('huangniurou').badges[0][1] === 'new',
     JSON.stringify(store.P('huangniurou').badges));
  ok('香椿酱旧徽章 [国家地理标志, gi] 纠正为 [国家地理标志原料, gi]',
     store.P('chunya').badges.length === 1 &&
     store.P('chunya').badges[0][0] === '国家地理标志原料' &&
     store.P('chunya').badges[0][1] === 'gi',
     JSON.stringify(store.P('chunya').badges));
  ok('清单以外的云端徽章改动保留（馓子 2 个徽章）',
     store.P('sanzi').badges.length === 2 &&
     store.P('sanzi').badges[1][0] === '手工盘条',
     JSON.stringify(store.P('sanzi').badges));

  // ================= 场景三：礼盒价纠正与守卫 =================
  // 只灌礼盒（商品/县区留空），礼盒的 items 由内置数据补齐，
  // 单品合计按内置现价算：年味 197 / 尝鲜 118 / 企业 313。
  async function storeWithGiftboxes(rows) {
    global.wx = {
      getStorageSync: () => null,
      setStorageSync: () => {},
      cloud: cloudStub({ giftboxes: rows }),
    };
    const s = freshStore();
    s.init();
    await new Promise(r => setTimeout(r, 30));
    return s;
  }
  const boxOf = (s, id) => s.allGiftboxes().find(g => g.id === id);

  head('场景三 · 礼盒旧价纠正与价格守卫');
  const s3 = await storeWithGiftboxes([
    { _id: 'gb-qiye', price: 358, sort: 30 },      // 旧错价
    { _id: 'gb-tuan', price: 109, sort: 20 },      // 云端合法改价（≤ 118）
    { _id: 'gb-nianwei', price: 9999, sort: 10 },  // 高于单品合计 197
  ]);
  ok('企业礼盒旧价 358 纠正为内置 299',
     boxOf(s3, 'gb-qiye').price === 299, boxOf(s3, 'gb-qiye').price);
  ok('礼盒价 9999 超过单品合计 197 → 回退内置 188',
     boxOf(s3, 'gb-nianwei').price === 188, boxOf(s3, 'gb-nianwei').price);
  ok('云端合法改价 109 保留不动',
     boxOf(s3, 'gb-tuan').price === 109, boxOf(s3, 'gb-tuan').price);

  head('场景四 · 礼盒价非法类型回退');
  const s4 = await storeWithGiftboxes([
    { _id: 'gb-qiye', price: 'abc', sort: 30 },    // 非数字
    { _id: 'gb-tuan', price: NaN, sort: 20 },      // NaN
    { _id: 'gb-nianwei', price: 0, sort: 10 },     // 非正数
  ]);
  ok('礼盒价是字符串 → 回退内置 299',
     boxOf(s4, 'gb-qiye').price === 299, boxOf(s4, 'gb-qiye').price);
  ok('礼盒价是 NaN → 回退内置 99',
     boxOf(s4, 'gb-tuan').price === 99, boxOf(s4, 'gb-tuan').price);
  ok('礼盒价是 0 → 回退内置 188',
     boxOf(s4, 'gb-nianwei').price === 188, boxOf(s4, 'gb-nianwei').price);

  console.log();
  console.log(fail === 0 ? '全部通过 ✅' : `${fail} 项失败 ❌`);
  process.exit(fail === 0 ? 0 : 1);
})();
