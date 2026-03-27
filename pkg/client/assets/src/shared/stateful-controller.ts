export type StateChangeHandler<TState> = (state: TState) => void;

export class StatefulController<TState> {
  #state: TState;
  #onStateChange?: StateChangeHandler<TState>;

  constructor(initialState: TState, onStateChange?: StateChangeHandler<TState>) {
    this.#state = initialState;
    this.#onStateChange = onStateChange;
  }

  getState(): TState {
    return this.#state;
  }

  protected setState(state: TState): void {
    this.#state = state;
    this.#onStateChange?.(state);
  }

  protected get state(): TState {
    return this.#state;
  }

  protected set state(state: TState) {
    this.setState(state);
  }
}
