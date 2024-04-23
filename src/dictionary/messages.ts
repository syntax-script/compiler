type StaticErrorMessage = string;
type DynamicErrorMessage<T> = (v: T) => string;
type TDDynamicErrorMessage<T, T2> = (v: T, v2: T2) => string;
type ErrorMessage = StaticErrorMessage | DynamicErrorMessage<unknown> | TDDynamicErrorMessage<unknown,unknown>;

export type { StaticErrorMessage, DynamicErrorMessage, TDDynamicErrorMessage, ErrorMessage };