export type Promiseable<T> = Promise<T> | T;

export type OptionalReturn<T> = T | undefined | void;
export type CallbackResult<T> = Promiseable<OptionalReturn<T>>;

export type NoUndefinedField<T, K extends keyof T> = { [P in keyof Pick<T, K>]-?: Exclude<T[P], null | undefined> };
export type RequiredProperties<T, K extends keyof T> = T & NoUndefinedField<T, K>;
