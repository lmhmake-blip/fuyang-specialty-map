/** 轻提示：页面 data 里放 toastText，WXML 引入 templates/toast.wxml 即可 */
function toast(page, text, duration) {
  if (!page || typeof page.setData !== 'function') return;
  page.setData({ toastText: text });
  if (page._toastTimer) clearTimeout(page._toastTimer);
  page._toastTimer = setTimeout(() => {
    page.setData({ toastText: '' });
  }, duration || 1700);
}
module.exports = { toast };
