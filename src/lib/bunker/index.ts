/**
 * NIP-46 bunker — relay loop (`nip46-loop`) and pure helpers (`nip46-methods`) for `nostr-tools` / BitMacro Connect interop.
 */

export {
  isRunning,
  startBunker,
  stopAllBunkers,
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
