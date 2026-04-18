/** Comparison table structure — labels come from `landing.compare` messages */

export type ComparePillId = "android" | "desktop" | "any" | "paidAddon" | "na";

export type CompareCellDef =
  | { kind: "yes" }
  | { kind: "no" }
  | { kind: "partial" }
  | { kind: "yesPhase2" }
  | { kind: "pill"; id: ComparePillId }
  | { kind: "yesPill"; pill: string };

export type CompareCategoryId =
  | "platform"
  | "identity"
  | "security"
  | "bunker"
  | "ecosystem";

export type CompareRowDef =
  | { type: "category"; id: CompareCategoryId }
  | {
      type: "row";
      featureId: string;
      detailId?: string;
      amber: CompareCellDef;
      alby: CompareCellDef;
      signer: CompareCellDef;
    };

export const COMPARISON_ROW_DEFS: CompareRowDef[] = [
  { type: "category", id: "platform" },
  {
    type: "row",
    featureId: "supportedDevices",
    amber: { kind: "pill", id: "android" },
    alby: { kind: "pill", id: "desktop" },
    signer: { kind: "pill", id: "any" },
  },
  {
    type: "row",
    featureId: "noInstall",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "worksIos",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "noExtension",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  { type: "category", id: "identity" },
  {
    type: "row",
    featureId: "integratedKeypair",
    amber: { kind: "yes" },
    alby: { kind: "yes" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "nip05Plan",
    amber: { kind: "no" },
    alby: { kind: "pill", id: "paidAddon" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "lightningAddress",
    amber: { kind: "no" },
    alby: { kind: "pill", id: "paidAddon" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "unifiedOnboarding",
    detailId: "unifiedOnboardingDetail",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  { type: "category", id: "security" },
  {
    type: "row",
    featureId: "nsecNeverExposed",
    amber: { kind: "yes" },
    alby: { kind: "yes" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "clientDecrypt",
    amber: { kind: "yes" },
    alby: { kind: "partial" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "zeroKnowledgeHosted",
    amber: { kind: "pill", id: "na" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "shamirRecovery",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yesPhase2" },
  },
  {
    type: "row",
    featureId: "auditableCode",
    amber: { kind: "yes" },
    alby: { kind: "yes" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "reproducibleBuilds",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yesPhase2" },
  },
  { type: "category", id: "bunker" },
  {
    type: "row",
    featureId: "remoteBunker",
    amber: { kind: "yes" },
    alby: { kind: "partial" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "twentyFourSeven",
    amber: { kind: "no" },
    alby: { kind: "partial" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "autoSigningPolicy",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "sessionTtl",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "sessionRevoke",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "auditLog",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "webUi",
    amber: { kind: "no" },
    alby: { kind: "partial" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "bunkerQr",
    amber: { kind: "yes" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "managedHosted",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "selfHostDocker",
    amber: { kind: "yes" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  { type: "category", id: "ecosystem" },
  {
    type: "row",
    featureId: "relayIncluded",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "lightningIntegrated",
    amber: { kind: "no" },
    alby: { kind: "yes" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "lightningPayments",
    amber: { kind: "no" },
    alby: { kind: "yes" },
    signer: { kind: "yes" },
  },
  {
    type: "row",
    featureId: "devSdk",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yesPill", pill: "@bitmacro/relay-connect" },
  },
  {
    type: "row",
    featureId: "fullStack",
    amber: { kind: "no" },
    alby: { kind: "no" },
    signer: { kind: "yes" },
  },
];
