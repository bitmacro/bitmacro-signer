import packageJson from "../../package.json";

/** Shipped semver — visible in UI and must match release / image label. */
export const SIGNER_PACKAGE_NAME = packageJson.name as string;
export const SIGNER_PACKAGE_VERSION = packageJson.version as string;
export const SIGNER_REPOSITORY_URL = "https://github.com/bitmacro/bitmacro-signer";
