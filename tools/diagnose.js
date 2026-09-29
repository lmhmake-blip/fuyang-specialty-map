#!/usr/bin/env node
/* ============================================================
   连上微信开发者工具的自动化接口，把 Console 输出和异常抓出来。

   用法：
     1. 开发者工具 → 设置 → 安全设置 → 打开「服务端口」
     2. 另开终端跑：cli auto --project <项目路径> --auto-port 9420
     3. NODE_PATH=~/node-repl-deps/node_modules node tools/diagnose.js

   为什么要有这个：模拟器里的报错只在「调试器」面板可见，
   截图容易漏，而且没法程序化读取。
   ============================================================ */
const automator = require('miniprogram-automator');

const WS = process.env.WS || 'ws://127.0.0.1:9420';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('连接', WS);
  const mp = await automator.connect({ wsEndpoint: WS });
  console.log('✅ 已连接\n');

  mp.on('console', msg => {
    const args = (msg.args || []).map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); }
      catch (e) { return String(a); }
    }).join(' ');
    console.log(`[console:${msg.type}] ${args}`);
  });

  mp.on('exception', err => {
    console.log('\n❌ [异常] ' + (err.message || JSON.stringify(err)));
    if (err.stack) console.log(err.stack);
    console.log();
  });

  // 触发一次完整启动，抓启动阶段的报错
  console.log('--- reLaunch /pages/index/index ---');
  try { await mp.reLaunch('/pages/index/index'); }
  catch (e) { console.log('reLaunch 失败:', e.message); }
  await sleep(4000);

  // 探测运行时状态：页面注册了吗？app 起来了吗？
  try {
    const probe = await mp.evaluate(function () {
      var out = {};
      try {
        out.pages = getCurrentPages().map(function (p) { return p.route; });
      } catch (e) { out.pages = 'ERR ' + e.message; }
      try {
        var app = getApp();
        out.globalData = app ? Object.keys(app.globalData) : 'getApp() 返回空';
        out.cloudReady = app && app.globalData.cloudReady;
        out.statusBarHeight = app && app.globalData.statusBarHeight;
      } catch (e) { out.app = 'ERR ' + e.message; }
      return out;
    });
    console.log('\n运行时探测:', JSON.stringify(probe, null, 2));
  } catch (e) {
    console.log('evaluate 失败:', e.message);
  }

  // 截一张模拟器的图留证
  try {
    await mp.screenshot({ path: 'tools/_diagnose-shot.png' });
    console.log('\n模拟器截图: tools/_diagnose-shot.png');
  } catch (e) { console.log('截图失败:', e.message); }

  mp.disconnect();
  process.exit(0);
})().catch(e => {
  console.error('总体失败:', e.message);
  process.exit(1);
});
