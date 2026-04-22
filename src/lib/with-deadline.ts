/** Race against clock when the HTTP client hangs without rejecting (e.g. broken IPv6 path). */
export function withDeadline<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    handle = setTimeout(() => {
      reject(new Error(`${label}: deadline ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (handle !== undefined) clearTimeout(handle);
  }) as Promise<T>;
}
