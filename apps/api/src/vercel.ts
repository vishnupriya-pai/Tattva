import { createApp } from './app';

/**
 * Vercel Function entry (docs/deployment.md). An Express app is itself a
 * (req, res) handler, so the platform calls it directly; server.ts (which
 * calls listen) is only for local/long-running hosts.
 */
export default createApp();
