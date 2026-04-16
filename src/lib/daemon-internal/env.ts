/**
 * Self-host: signer-web chama o processo signer-daemon na rede Docker (HTTP interno).
 * Se DAEMON_INTERNAL_URL não estiver definido, o bunker corre no mesmo processo Next (dev local).
 */

export type DaemonInternalConfig = {
  baseUrl: string;
  token: string;
};

/**
 * @returns null se o bunker NIP-46 deve correr in-process (sem daemon remoto).
 * @throws Error se DAEMON_INTERNAL_URL está definido mas falta token (config inválida).
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
