interface LiveGwEnv {
  FPL_BASE_URL: string;
}

export class LiveGwDO {
  private state: DurableObjectState;
  private env: LiveGwEnv;

  constructor(state: DurableObjectState, env: LiveGwEnv) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const gw = url.searchParams.get('gw') ?? 'unknown';

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.state.acceptWebSocket(server);
    const connected = this.state.getWebSockets().length;
    console.warn(`LiveGwDO[gw:${gw}]: ws accepted (connected=${connected})`);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const size = typeof message === 'string' ? message.length : message.byteLength;
    console.warn(`LiveGwDO: ws message (${size} bytes)`);
  }

  async webSocketClose(
    _ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    const remaining = this.state.getWebSockets().length;
    console.warn(
      `LiveGwDO: ws close code=${code} clean=${wasClean} reason="${reason}" remaining=${remaining}`
    );
  }

  async alarm(): Promise<void> {
    console.warn(`LiveGwDO: alarm fired (no-op stub; polling lands in LF-04)`);
  }
}
