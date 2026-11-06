/**
 * 回归：出牌阶段超时必须能结束（issue #200）
 *
 * 宿主 countChoose() 超时走 ui.click.cancel()（无参，game/index.js 的 finish）；
 * 旧拦截不区分调用来源，只要有选牌就 restore 后 return，既不写 event.result，
 * 也不 game.resume()，倒计时已清空而 _status.imchoosing 仍为 true，
 * 下一次 countChoose 直接早退 ——【狂才】5 秒到点永远结束不了出牌阶段。
 *
 * 运行：在仓库根执行 node --test（自动发现本文件；路径基于 ../ui 相对定位）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../ui/lbtn/skins/base.js', import.meta.url), 'utf8')).replace(/^import .* from "noname";\s*/m, '');
const { createBaseLbtnPlugin } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function setup(cards = 1, targets = 0, skill = null) {
  const calls = { original: 0, restore: 0, uncheck: 0, check: 0 };
  const button = { link: 'cancel' };
  const confirm = { node: { cancel: button }, classList: { add() {} } };
  const ui = { confirm, selected: { cards: Array(cards).fill({}), targets: Array(targets).fill({}) }, click: { cancel(...args) { calls.original++; calls.thisValue = this; calls.args = args; return 42; } } };
  const event = { name: 'chooseToUse', type: 'phase', skill, restore() { calls.restore++; }, player: { getCards() { return []; } } };
  const game = { uncheck() { calls.uncheck++; }, check() { calls.check++; } };
  createBaseLbtnPlugin({}, game, ui, {}, {}, { event }, {}).initCancelIntercept();
  return { ui, calls, button, event };
}
test('system cancellation passes through with selections and preserves arguments and receiver', () => {
  for (const [cards, targets] of [[1,0],[3,0],[1,1],[0,1],[0,0]]) {
    const { ui, calls } = setup(cards, targets); const receiver = {};
    assert.equal(ui.click.cancel.call(receiver), 42);
    assert.equal(calls.original, 1); assert.equal(calls.restore, 0); assert.equal(calls.thisValue, receiver); assert.deepEqual(calls.args, []);
  }
});
test('current cancel button clears selected cards or targets only', () => {
  for (const [cards, targets] of [[1,0],[0,1],[1,1]]) {
    const { ui, calls, button } = setup(cards, targets); ui.click.cancel(button);
    assert.equal(calls.original, 0); assert.equal(calls.restore, 1); assert.equal(calls.uncheck, 1); assert.equal(calls.check, 1);
  }
});
test('empty selection, skill, and unrelated node pass through once', () => {
  for (const mode of ['empty','skill','foreign']) {
    const { ui, calls, button } = setup(mode === 'empty' ? 0 : 1, 0, mode === 'skill' ? 'skill' : null);
    const arg = mode === 'foreign' ? { link: 'cancel' } : button;
    assert.equal(ui.click.cancel(arg, 'extra'), 42); assert.equal(calls.original, 1); assert.equal(calls.restore, 0); assert.deepEqual(calls.args, [arg, 'extra']);
  }
});
test('online style relies on base cancellation wrapper', async () => {
  const online = await readFile(new URL('../ui/lbtn/skins/online.js', import.meta.url), 'utf8');
  assert.doesNotMatch(online, /initCancelOverride/);
});
