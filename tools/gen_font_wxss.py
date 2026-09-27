"""把子集字体包装成 WXSS @font-face（data URI 内联）

用法: python tools/gen_font_wxss.py
"""
import base64, io, os

W = 'tools/font-build/FYSerif-700.woff2'
OUT = 'miniprogram/assets/font/font.wxss'

b64 = base64.b64encode(io.open(W, 'rb').read()).decode()

css = f"""/* ============================================================
   思源宋体子集 · 自动生成，请勿手改
   字体：Noto Serif SC (SIL OFL 1.1) → 子集化为项目用到的字符
   源文件：{os.path.basename(W)}（woff2 {os.path.getsize(W)/1024:.1f} KB）
   重新生成：
     uv run --with fonttools --with brotli python tools/subset_font.py
     python tools/gen_font_wxss.py
   注意：改了文案（新增商品/地名）可能需要重新子集，否则缺字会退回系统字体
   ============================================================ */
@font-face {{
  font-family: 'FYSerif';
  src: url("data:font/woff2;base64,{b64}") format('woff2');
  font-weight: 700;
  font-style: normal;
}}
"""
io.open(OUT, 'w', encoding='utf-8').write(css)
print(f'font.wxss 生成：{os.path.getsize(OUT)/1024:.1f} KB')
