const STORAGE_KEY_EXPIRES_AT = 'expiresAt';
const DEFAULT_TTL_SECS = 300;

export class CohortLockDO {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/acquire') {
      const ttlParam = Number(url.searchParams.get('ttl'));
      const ttlSeconds = Number.isFinite(ttlParam) && ttlParam > 0 ? ttlParam : DEFAULT_TTL_SECS;
      const now = Date.now();
      const expiresAt = await this.state.storage.get<number>(STORAGE_KEY_EXPIRES_AT);
      if (typeof expiresAt === 'number' && expiresAt > now) {
        return new Response('held', { status: 409 });
      }
      await this.state.storage.put(STORAGE_KEY_EXPIRES_AT, now + ttlSeconds * 1000);
      return new Response('acquired', { status: 200 });
    }

    if (url.pathname === '/release') {
      await this.state.storage.delete(STORAGE_KEY_EXPIRES_AT);
      return new Response('released', { status: 200 });
    }

    return new Response('not found', { status: 404 });
  }
}
