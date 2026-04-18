/**
 * Self-host: signer-web calls signer-daemon over the Docker network (internal HTTP).
 * If DAEMON_INTERNAL_URL is unset, the bunker runs in the same Next process (local dev).
 */

export type DaemonInternalConfig = {
  baseUrl: string;
  token: string;
};

/**
 * @returns null if the NIP-46 bunker should run in-process (no remote daemon).
 * @throws Error if DAEMON_INTERNAL_URL is set but the token is missing (invalid config).
 */
export function getDaemonInternalConfig(): DaemonInternalConfig | null {
  const baseUrl = process.env.DAEMON_INTERNAL_URL?.trim();
  const token = process.env.DAEMON_INTERNAL_TOKEN?.trim();
  if (!baseUrl) {
    return null;
  }
  if (!token) {
    throw new Error(
      "DAEMON_INTERNAL_URL is set but DAEMON_INTERNAL_TOKEN is missing",
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), token };
}
