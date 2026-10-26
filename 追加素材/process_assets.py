#!/usr/bin/env python3
"""raw/ の生成画像（緑 or マゼンタ背景）を、背景透過・被写体の外枠で切り抜き・縮小して out/ に出力する。
使い方: python3 process_assets.py   （要 pillow, numpy）
"""
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = os.path.join(HERE, 'raw'), os.path.join(HERE, 'out')
os.makedirs(OUT, exist_ok=True)
MAGENTA = {'salad_maki', 'futomaki', 'umeshiso_maki'}   # 背景がマゼンタの画像
MAX_W = 300                                              # 出力の最大幅(px)
EDGE = 14                                                # 角の丸み・端のノイズを避けて落とす幅(px)

def key_alpha(rgb, magenta):
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    d = (np.minimum(r, b) - g) if magenta else (g - np.maximum(r, b))   # 背景らしさ
    h, w = d.shape
    border = np.concatenate([d[:8].ravel(), d[-8:].ravel(), d[:, :8].ravel(), d[:, -8:].ravel()])
    bg = float(np.median(border))                                        # 背景の d の代表値
    hi, lo = bg * 0.62, bg * 0.28                                        # この間をなめらかに透過（接地影の緑にじみも消える）
    a = np.clip((hi - d) / (hi - lo), 0, 1)
    return a, d

def despill(rgb, a, d, magenta):
    out = rgb.astype(np.float32)
    edge = (a < 0.999)                                                   # 輪郭付近だけ色にじみを除去
    if magenta:
        m = np.minimum(out[..., 0], out[..., 2]); ex = np.clip(m - out[..., 1], 0, None) * 0.85
        out[..., 0] -= ex * edge; out[..., 2] -= ex * edge
    else:
        ex = np.clip(out[..., 1] - np.maximum(out[..., 0], out[..., 2]), 0, None) * 0.85
        out[..., 1] -= ex * edge
    return np.clip(out, 0, 255).astype(np.uint8)

def process(name):
    src = Image.open(os.path.join(RAW, name + '.png')).convert('RGB')
    w, h = src.size
    src = src.crop((EDGE, EDGE, w - EDGE, h - EDGE))
    rgb = np.array(src)
    magenta = name in MAGENTA
    a, d = key_alpha(rgb, magenta)
    rgb = despill(rgb, a, d, magenta)
    rgba = np.dstack([rgb, (a * 255).astype(np.uint8)])
    im = Image.fromarray(rgba, 'RGBA')
    bbox = Image.fromarray((a * 255).astype(np.uint8)).point(lambda v: 255 if v > 24 else 0).getbbox()
    if not bbox:
        raise SystemExit(f'{name}: 被写体が見つかりません')
    pad = 4
    bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(im.width, bbox[2] + pad), min(im.height, bbox[3] + pad))
    im = im.crop(bbox)
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.png'), optimize=True)
    return im.size

if __name__ == '__main__':
    names = sorted(f[:-4] for f in os.listdir(RAW) if f.endswith('.png'))
    total = 0
    for n in names:
        sz = process(n); kb = os.path.getsize(os.path.join(OUT, n + '.png')) // 1024; total += kb
        print(f'{n:16s} {sz[0]}x{sz[1]}  {kb}KB')
    print(f'{len(names)}枚 合計 {total}KB')
