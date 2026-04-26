export const SignerEvents = {
  loki: {
    ping: 'signer.loki.ping',
  },
  identityBootstrap: {
    started: 'signer.identity_bootstrap.started',
    success: 'signer.identity_bootstrap.success',
    failed: 'signer.identity_bootstrap.failed',
  },
} as const
