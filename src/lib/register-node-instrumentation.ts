import dns from "node:dns";

/**
 * Prefer A records over AAAA for outbound HTTPS (OpenAI, etc.).
 * Complements NODE_OPTIONS=--dns-result-order=ipv4first for standalone/runtime edge cases.
 */
dns.setDefaultResultOrder("ipv4first");

const ver = process.env.BITMACRO_SIGNER_VERSION?.trim() || "(unset)";
const sha = process.env.SIGNER_GIT_COMMIT?.trim().slice(0, 7) || "unset";
console.info(
  `[bitmacro-signer] boot semver=${ver} commit=${sha} node=${process.version}`,
);
