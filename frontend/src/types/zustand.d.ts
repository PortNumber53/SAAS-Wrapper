declare module 'zustand' {
  export type PartialState<T> = Partial<T> | ((state: T) => Partial<T>)
  export type StateCreator<T> = (
    set: (partial: PartialState<T>, replace?: boolean) => void,
    get: () => T,
    api: any
  ) => T
  export interface StoreApi<T> {
    getState: () => T
    setState: (partial: PartialState<T>, replace?: boolean) => void
    subscribe: (listener: (state: T, prevState: T) => void) => () => void
  }
  export function create<T>(initializer: StateCreator<T>): ((selector?: (state: T) => any) => any) & StoreApi<T>
}
