"""思源宋体子集化：只保留项目里真正用到的字，输出 woff2 + base64

用法: uv run --with fonttools --with brotli python tools/subset_font.py
"""
import re, io, os, glob, base64, sys
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = 'tools/NotoSerifSC-var.ttf'
# 放包外：只有 base64 内联进 WXSS 的那一份进包，避免 woff2 重复占体积
OUT_DIR = 'tools/font-build'

def collect_chars():
    """扫项目所有文案，收集用到的字符"""
    chars = set()
    patterns = ['miniprogram/**/*.wxml', 'miniprogram/**/*.js', 'miniprogram/**/*.json']
    for pat in patterns:
        for f in glob.glob(pat, recursive=True):
            t = io.open(f, encoding='utf-8').read()
            chars |= set(re.findall(r'[一-鿿㐀-䶿]', t))
            chars |= set(re.findall(r'[　-〿＀-￯]', t))
    # 数字、拉丁、常用符号（价格、单位、年份等）
    chars |= set('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
    chars |= set('.,:;!?%¥$·—–…、。，：；！？（）()【】《》""\'\' /+-*#@&')
    return chars

def _rename(font, family, style, weight):
    """把 name 表清干净并重设，保证各平台一致"""
    name = font['name']
    name.names = []
    for pid, eid, lid in ((3, 1, 0x409), (1, 0, 0)):
        name.setName(family, 1, pid, eid, lid)                 # Family
        name.setName(style, 2, pid, eid, lid)                  # Subfamily
        name.setName(f'{family} {style}', 4, pid, eid, lid)    # Full name
        name.setName(f'{family}-{style}', 6, pid, eid, lid)    # PostScript
    font['OS/2'].usWeightClass = weight
    font['OS/2'].fsSelection = (font['OS/2'].fsSelection & ~0x40) | 0x20  # 置 BOLD 位
    font['head'].macStyle |= 0x01                                          # Mac 端 bold 位


def build(weight, chars, out_name):
    font = TTFont(SRC)
    inst = instancer.instantiateVariableFont(font, {'wght': weight}, inplace=False)
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.drop_tables += ['DSIG']
    opts.notdef_outline = True
    opts.recalc_bounds = True
    s = subset.Subsetter(options=opts)
    s.populate(text=''.join(sorted(chars)))
    s.subset(inst)
    # 重设字体名 —— 必须让 family 名正好等于 WXSS 里 font-family 的值，
    # 同时 subfamily/weightClass 要与 CSS 的 font-weight:700 对上，
    # 否则要么匹配不上、要么被浏览器合成加粗而变形。
    _rename(inst, 'FYSerif', 'Bold', 700)
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, out_name)
    inst.flavor = 'woff2'
    inst.save(path)
    return path

if __name__ == '__main__':
    chars = collect_chars()
    print(f'收集到 {len(chars)} 个不重复字符')
    total = 0
    for w, name in [(700, 'FYSerif-700.woff2')]:
        p = build(w, chars, name)
        size = os.path.getsize(p)
        total += size
        b64len = len(base64.b64encode(open(p, 'rb').read()))
        print(f'  wght={w}: {p}  {size/1024:.1f} KB  (base64 后 {b64len/1024:.1f} KB)')
    print(f'合计 woff2 {total/1024:.1f} KB')
