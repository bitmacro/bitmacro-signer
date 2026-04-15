/**
 * Bunker NIP-46 — relay loop (`nip46-loop`) e métodos puros (`nip46-methods`) para interop com `nostr-tools` / BitMacro Connect.
 */

export {
  isRunning,
  startBunker,
  stopBunker,
} from "./nip46-loop";

export {
  NOSTR_CONNECT_KIND,
  formatNip46RpcResponse,
  parseNip46RpcPayload,
  runNip46Method,
  type Nip46MethodDeps,
  type Nip46RpcRequest,
  type Nip46RpcResult,
} from "./nip46-methods";
