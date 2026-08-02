export type StateChangeHandler<TState> = (state: TState) => void;
export declare class StatefulController<TState> {
    #private;
    constructor(initialState: TState, onStateChange?: StateChangeHandler<TState>);
    getState(): TState;
    protected setState(state: TState): void;
    protected get state(): TState;
    protected set state(state: TState);
}
//# sourceMappingURL=stateful-controller.d.ts.map