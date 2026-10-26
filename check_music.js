// BGM の構成を「音を出さずに」点検する。使い方: node check_music.js
// 音の処理だけ取り出して模擬の AudioContext で 16 小節ぶん走らせ、小節ごとの 低音/高音/打楽器 の数を数える。
const fs = require('fs'), path = require('path');
const tpl = fs.readFileSync(path.join(__dirname, 'src', 'game.template.html'), 'utf8');
const a = tpl.indexOf('/* ===================== 音 ===================== */'), b = tpl.indexOf('/* ===================== 状態');
const code = tpl.slice(a, b);

function run(fever) {
  const ev = [];                                        // {bar, kind, f}
  let bar = 0;
  const mkParam = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, value: 0 });
  const ac = {
    currentTime: 0, sampleRate: 44100, destination: {}, state: 'running',
    createOscillator() { const o = { type: 'sine', frequency: mkParam(), connect() {}, start() { ev.push({ bar, kind: 'osc', type: o.type, f: o.frequency._f }); }, stop() {} };
      const sv = o.frequency.setValueAtTime; o.frequency.setValueAtTime = (f) => { o.frequency._f = f; }; return o; },
    createGain() { return { gain: mkParam(), connect() {} }; },
    createBiquadFilter() { return { type: '', frequency: mkParam(), Q: mkParam(), gain: mkParam(), connect() {} }; },
    createDynamicsCompressor() { return { connect() {} }; },
    createBuffer() { return { getChannelData: () => new Float32Array(4) }; },
    createBufferSource() { const s = { connect() {}, start() { ev.push({ bar, kind: 'noise' }); }, stop() {} }; return s; },
  };
  const G = { combo: 0, fever: fever ? 8 : 0, time: 60 };
  const f = new Function('G', 'window', 'document', 'ac', code + `
    AC = ac; MG = { connect() {} }; NB = {};
    bgm.on = true; bgm.step = 0; bgm.next = 0;
    return { bgmTick, bgm, setBar: null };`);
  const api = f(G, { AudioContext: function () {} }, {}, ac);
  const origSetTimeout = global.setTimeout; global.setTimeout = () => 0;        // 光らせる処理は無視
  for (let i = 0; i < 4000 && api.bgm.step < 16 * 16; i++) { ac.currentTime += 0.05; bar = Math.floor(api.bgm.step / 16); api.bgmTick(); }
  global.setTimeout = origSetTimeout;
  return ev;
}
for (const fever of [false, true]) {
  const ev = run(fever);
  console.log(fever ? '\n=== FEVER中 ===' : '=== 通常 ===');
  console.log('小節 | 8小節の役割            | 低音(<150Hz) | 中音 | 高音(>1000Hz) | ノイズ(ハット/クラップ等)');
  const role = ['四つ打ち', '四つ打ち', 'シンコペ', 'シンコペ', '16分ハット+鐘', '16分ハット+鐘', '小休止(低音+鐘)', 'フィル(連打/タム)'];
  for (let bar = 0; bar < 16; bar++) {
    const e = ev.filter(x => x.bar === bar);
    const osc = e.filter(x => x.kind === 'osc'), noise = e.filter(x => x.kind === 'noise').length;
    const low = osc.filter(x => x.f < 150).length, high = osc.filter(x => x.f > 1000).length, mid = osc.length - low - high;
    console.log(`${String(bar % 8 + 1).padStart(2)}   | ${role[bar % 8].padEnd(20, '　')} | ${String(low).padStart(6)}      | ${String(mid).padStart(4)} | ${String(high).padStart(7)}       | ${noise}`);
    if (bar === 7 && false) console.log('');
  }
}
