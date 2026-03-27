import test from 'node:test';
import assert from 'node:assert/strict';

const { StatefulController } = await import('../dist/shared/stateful-controller.js');

class TestStatefulController extends StatefulController {
  constructor(initialState, onStateChange) {
    super(initialState, onStateChange);
  }

  transition(nextState) {
    this.state = nextState;
  }
}

test('stateful controller returns the current state snapshot', () => {
  const controller = new TestStatefulController('idle');

  assert.equal(controller.getState(), 'idle');

  controller.transition('ready');

  assert.equal(controller.getState(), 'ready');
});

test('stateful controller publishes onStateChange when state mutates', () => {
  const seen = [];
  const controller = new TestStatefulController({ loading: false }, (state) => {
    seen.push(state);
  });

  controller.transition({ loading: true });

  assert.deepEqual(seen, [{ loading: true }]);
  assert.deepEqual(controller.getState(), { loading: true });
});
