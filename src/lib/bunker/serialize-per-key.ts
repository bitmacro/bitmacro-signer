/**
 * Runs async tasks one at a time per key, in arrival order. Tasks with different keys run
 * concurrently. A rejected task does not block the next one for the same key.
 *
 * Used by the NIP-46 loop so a client's `get_public_key` / `sign_event` cannot overtake its
 * own `connect` (which binds the session in the database before the app is authorized).
 */
export function createKeyedSerializer(): <T>(
  key: string,
  task: () => Promise<T>,
) => Promise<T> {
  const tails = new Map<string, Promise<unknown>>();
  return async function run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const prev = tails.get(key) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(task);
    tails.set(key, next);
    try {
      return await next;
    } finally {
      if (tails.get(key) === next) tails.delete(key);
    }
  };
}
