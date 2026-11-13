import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Every route in this app is request-scoped (live FPL data, Supabase session,
// Stripe), so no incremental cache is configured. Static assets are served by
// the ASSETS binding declared in wrangler.jsonc.
export default defineCloudflareConfig({});
