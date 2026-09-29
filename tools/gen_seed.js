#!/usr/bin/env node
/* ============================================================
   从 miniprogram/data/catalog.js 生成云开发数据库的导入文件

   用法：node tools/gen_seed.js
   产出：tools/seed/{districts,products,giftboxes}.json
        格式为 JSON Lines（每行一个对象）—— 云开发控制台导入要求的格式

   为什么要这几步：
   - 数组顺序在数据库里不保证，所以显式加 sort 字段
   - 老板将来要上下架商品，所以预留 onSale
   - 商品图放云存储，所以预留 image（空字符串 = 前端回退到色块+短名）
   ============================================================ */
const fs = require('fs');
const path = require('path');

const catalog = require(path.join(__dirname, '..', 'miniprogram', 'data', 'catalog.js'));
const OUT = path.join(__dirname, 'seed');
const now = Date.now();

fs.mkdirSync(OUT, { recursive: true });

function write(name, rows) {
  // JSON Lines：每行一个 JSON 对象，不要数组包裹
  const body = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, name + '.json'), body, 'utf-8');
  return body.length;
}

const districts = catalog.DISTRICTS.map((d, i) => ({
  _id: d.id,
  name: d.name, color: d.color, hint: d.hint, desc: d.desc, stats: d.stats,
  sort: (i + 1) * 10,
  updatedAt: now,
}));

const products = catalog.PRODUCTS.map((p, i) => ({
  _id: p.id,
  short: p.short, d: p.d, name: p.name, color: p.color, sub: p.sub,
  price: p.price, was: p.was, unit: p.unit, sold: p.sold,
  badges: p.badges, story: p.story, evidence: p.evidence, specs: p.specs,
  image: '',            // 云存储 fileID；空则前端用色块+短名兜底
  onSale: true,         // 上下架开关（管理端用）
  sort: (i + 1) * 10,
  updatedAt: now,
}));

const giftboxes = catalog.GIFT_BOXES.map((g, i) => ({
  _id: g.id,
  name: g.name, price: g.price, was: g.was, color: g.color,
  desc: g.desc, items: g.items, tag: g.tag,
  image: '',
  onSale: true,
  sort: (i + 1) * 10,
  updatedAt: now,
}));

write('districts', districts);
write('products', products);
write('giftboxes', giftboxes);

console.log(`districts  ${districts.length} 条`);
console.log(`products   ${products.length} 条`);
console.log(`giftboxes  ${giftboxes.length} 条`);
console.log(`→ ${OUT}`);
