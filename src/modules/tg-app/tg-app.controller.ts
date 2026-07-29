import type { TgAppService } from './tg-app.service';

export interface TgAppHttpRequest {
  method: string;
  pathname: string;
  authorization?: string;
  body?: unknown;
}

export interface TgAppHttpResponse {
  status: number;
  body: unknown;
}

export class TgAppController {
  constructor(private readonly service: TgAppService) {}

  async dispatch(request: TgAppHttpRequest): Promise<TgAppHttpResponse | null> {
    if (request.method === 'GET' && request.pathname === '/api/state') {
      return {
        status: 200,
        body: await this.service.getState(request.authorization),
      };
    }

    const match = request.pathname.match(/^\/api\/ranks\/([^/]+)\/assign$/);
    if (request.method === 'POST' && match) {
      const rankId = Number(match[1]);
      const recipientId = (request.body as { userId?: unknown } | undefined)?.userId;
      return {
        status: 200,
        body: await this.service.assign(
          request.authorization,
          rankId,
          Number(recipientId),
        ),
      };
    }

    return null;
  }
}
