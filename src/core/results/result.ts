export type Success<T> = Readonly<{
  ok: true;
  value: T;
}>;

export type Failure<E> = Readonly<{
  ok: false;
  error: E;
}>;

export type Result<T, E> = Success<T> | Failure<E>;

export function success<T>(value: T): Success<T> {
  return { ok: true, value };
}

export function failure<E>(error: E): Failure<E> {
  return { ok: false, error };
}
