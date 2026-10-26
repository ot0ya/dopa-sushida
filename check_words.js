// お題が全部「打てる形」か検証する。使い方: node check_words.js
const fs = require('fs'), path = require('path');
const tpl = fs.readFileSync(path.join(__dirname, 'src', 'game.template.html'), 'utf8');
const start = tpl.indexOf('const BASE = {};'), end = tpl.indexOf('class Matcher');
const words = fs.readFileSync(path.join(__dirname, 'src', 'words.js'), 'utf8');
const code = words + '\n' + tpl.slice(start, end) + '\nreturn {POOL, buildTokens};';
const { POOL, buildTokens } = new Function(code)();
const images = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')
  .match(/const SUSHI_DATA = (\{.*?\});\n/s)[1])));
let bad = 0;
POOL.forEach((list, c) => {
  const seen = new Set(), lens = [];
  for (const [jp, kana, img] of list) {
    try {
      const t = buildTokens(kana);
      if (!t.length || t.some(x => !x.alts || !x.alts.length || x.alts.some(a => !/^[a-z-]+$/.test(a)))) throw new Error('bad token');
      lens.push(t.length);
    } catch (e) { console.log('NG', c, jp, kana, e.message); bad++; }
    if (img && !images.has(/^[sdn]_/.test(img) ? img : 's_' + img)) { console.log('NO IMAGE', c, jp, img); bad++; }
    if (seen.has(kana)) console.log('dup', c, kana); seen.add(kana);
  }
  console.log(['梅', '竹', '松'][c], list.length + '語', '打鍵数', Math.min(...lens), '〜', Math.max(...lens));
});
console.log(bad ? bad + ' 件の問題' : 'ALL OK');
process.exit(bad ? 1 : 0);
