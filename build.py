#!/usr/bin/env python3
"""お寿司GIF(zip)とお題(src/words.js)を埋め込み、index.html と artifact.html を生成する。
使い方: python3 build.py
"""
import base64, json, os, re, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.expanduser('~/Desktop/個人/宣材写真・撮影素材')
ZIPS = ['お寿司.zip', 'お寿司2.zip']

data = {}
for z in ZIPS:
    with zipfile.ZipFile(os.path.join(SRC, z)) as zf:
        for n in zf.namelist():
            if n.endswith('.gif'):
                key = os.path.splitext(os.path.basename(n))[0]
                data[key] = 'data:image/gif;base64,' + base64.b64encode(zf.read(n)).decode()

# 追加素材（Gemini生成→背景透過済み）: 追加素材/out/*.png を n_<名前> として埋め込む
OUT_DIR = os.path.join(HERE, '追加素材', 'out')
if os.path.isdir(OUT_DIR):
    for f in sorted(os.listdir(OUT_DIR)):
        if f.endswith('.png'):
            data['n_' + f[:-4]] = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(OUT_DIR, f), 'rb').read()).decode()

words = open(os.path.join(HERE, 'src', 'words.js'), encoding='utf-8').read()
tpl = open(os.path.join(HERE, 'src', 'game.template.html'), encoding='utf-8').read()
out = tpl.replace('__WORDS__', words).replace('__SUSHI_DATA__', json.dumps(data, ensure_ascii=False))
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(out)

# Artifact 用：<html>/<head>/<body> の外枠を外し、暗色固定にする
title = re.search(r'<title>.*?</title>', out, re.S).group(0)
style = re.search(r'<style>.*?</style>', out, re.S).group(0).replace('<style>', '<style>\n:root{color-scheme:dark}\n', 1)
body = re.search(r'<body>(.*)</body>', out, re.S).group(1)
open(os.path.join(HERE, 'artifact.html'), 'w', encoding='utf-8').write(title + '\n' + style + '\n' + body)

print(f'{len(data)} images, index.html {len(out)//1024} KB')
