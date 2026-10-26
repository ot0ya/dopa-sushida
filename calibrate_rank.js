// ランクの基準点を決めるためのシミュレーション。使い方: node calibrate_rank.js
// 「毎秒 X 打鍵・ミス率 p のタイピスト」が各コースで何点取るかを、ゲームの得点ルールどおりに試算する。
const fs = require('fs'), path = require('path');
const tpl = fs.readFileSync(path.join(__dirname, 'src', 'game.template.html'), 'utf8');
const words = fs.readFileSync(path.join(__dirname, 'src', 'words.js'), 'utf8');
const code = words + '\n' + tpl.slice(tpl.indexOf('const BASE = {};'), tpl.indexOf('class Matcher')) + '\nreturn {POOL, buildTokens};';
const { POOL, buildTokens } = new Function(code)();
const TIME_BONUS = 0.25, TIME_CAP = 65;   // ゲーム本体と同じ値にそろえる
const COURSE_T = [{ b: 2.2, k: .38 }, { b: 1.8, k: .30 }, { b: 1.6, k: .27 }];
const info = POOL.map(list => list.map(([, kana]) => { const t = buildTokens(kana); return { n: t.length, keys: t.reduce((a, x) => a + x.alts[0].length, 0) }; }));

function play(course, kps, missP, rng) {
  let time = 60, elapsed = 0, score = 0, combo = 0, fever = 0, nextFever = 30;
  const sp = COURSE_T[course], dt = 0.02;
  while (time > 0) {
    const w = info[course][Math.floor(rng() * info[course].length)];
    const dur = sp.b + sp.k * w.keys; let wordT = 0, perfect = true, done = 0;
    let react = 0.35 + rng() * 0.2;                               // 次の語を見てから打ち始めるまで
    let acc = 0;                                                  // 打鍵の進み具合
    while (time > 0 && wordT < dur && done < w.keys) {
      const rate = (fever > 0 ? .65 : 1) * (1 + Math.min(.25, elapsed / 240));
      time -= dt; elapsed += dt; wordT += dt * rate; if (fever > 0) fever -= dt;
      if (react > 0) { react -= dt; continue; }
      acc += kps * dt;
      while (acc >= 1 && done < w.keys) {
        acc -= 1;
        if (rng() < missP) { combo = 0; nextFever = 30; perfect = false; acc -= 0.6; continue; } // ミス: 打ち直しで少し遅れる
        done++; combo++;
        const mult = 1 + Math.min(4, Math.floor(combo / 10)), fm = fever > 0 ? 2 : 1;
        score += 10 * mult * fm; if (fever > 0) fever = Math.min(12, fever + .15);
        if (fever <= 0 && combo >= nextFever) { fever = 8; nextFever += 30; }
      }
    }
    if (done >= w.keys) {
      const mult = 1 + Math.min(4, Math.floor(combo / 10)), fm = fever > 0 ? 2 : 1;
      score += w.n * 20 * mult * (perfect ? 2 : 1) * fm; if (perfect) time = Math.min(TIME_CAP, time + TIME_BONUS);
    }
  }
  play.lastElapsed = elapsed;
  return score;
}
function rngSeed(s) { return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const SPEEDS = [1.4, 2.1, 2.8, 3.5, 4.1, 4.7, 5.2, 5.7, 6.2, 6.6, 7.0, 7.5];
const MISS = 0.03, N = 400;
const table = {}, durs = {};
for (const c of [0, 1, 2]) {
  table[c] = SPEEDS.map(v => { let s = 0, e = 0; const r = rngSeed(12345 + c); for (let i = 0; i < N; i++) { s += play(c, v, MISS, r); e += play.lastElapsed; } durs[c + '_' + v] = (e / N).toFixed(0); return Math.round(s / N); });
  console.log(['梅', '竹', '松'][c], SPEEDS.map((v, i) => `${v}打/秒=${table[c][i]}`).join('  '));
}
console.log('平均プレイ時間(秒) 7打/秒:', [0,1,2].map(c=>durs[c+'_7']).join(' / '), ' 3.5打/秒:', [0,1,2].map(c=>durs[c+'_3.5']).join(' / '));
// ランクの境目は「その速度の人が平均で取る点」を 100 点単位に丸めたもの
console.log(JSON.stringify(Object.fromEntries([0, 1, 2].map(c => [c, table[c].map(x => Math.round(x / 100) * 100)]))));
