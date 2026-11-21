import {
  getDaemonInternalConfig,
  notifyDaemonRefreshNip46Relays,
} from "@/lib/daemon-internal";
import { isRunning, restartBunkerSubscriptions } from "@/lib/bunker";

/**
 * After a session row is created or removed: refresh relay subscriptions when
 * the set changed, and re-read how long key material may stay in RAM.
 * `restartBunkerSubscriptions` does both. No-op when the bunker is not running.
 */
export async function syncBunkerAfterSessionChange(
  identityId: string,
): Promise<void> {
  try {
    let daemonCfg: ReturnType<typeof getDaemonInternalConfig>;
    try {
      daemonCfg = getDaemonInternalConfig();
    } catch {
      return;
    }
    if (daemonCfg) {
      const out = await notifyDaemonRefreshNip46Relays(daemonCfg, identityId);
      if (!out.ok) {
        console.warn("[sessions] daemon refresh-nip46-relays:", out.message);
      }
    } else if (isRunning(identityId)) {
      await restartBunkerSubscriptions(identityId);
    }
  } catch (e) {
    console.warn("[sessions] syncBunkerAfterSessionChange:", e);
  }
}
