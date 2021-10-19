export type Promiseable<T> = Promise<T> | T;

export type OptionalReturn<T> = T | undefined | void;

export type CallbackResult<T> = Promiseable<OptionalReturn<T>>;
