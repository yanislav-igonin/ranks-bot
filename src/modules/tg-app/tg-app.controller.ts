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

    if (request.method === 'POST' && request.pathname === '/api/ranks') {
      const title = (request.body as { title?: unknown } | undefined)?.title;
      return {
        status: 200,
        body: await this.service.createRank(request.authorization, title),
      };
    }

    const assignMatch = request.pathname.match(/^\/api\/ranks\/([^/]+)\/assign$/);
    if (request.method === 'POST' && assignMatch) {
      const rankId = Number(assignMatch[1]);
      const body = request.body as
        | { userId?: unknown; comment?: unknown }
        | undefined;
      return {
        status: 200,
        body: await this.service.assign(
          request.authorization,
          rankId,
          Number(body?.userId),
          body?.comment === undefined ? '' : body.comment,
        ),
      };
    }

    const rankMatch = request.pathname.match(/^\/api\/ranks\/([^/]+)$/);
    if (request.method === 'DELETE' && rankMatch) {
      return {
        status: 200,
        body: await this.service.deleteRank(
          request.authorization,
          Number(rankMatch[1]),
        ),
      };
    }

    const assignmentMatch = request.pathname.match(/^\/api\/assignments\/([^/]+)$/);
    if (request.method === 'DELETE' && assignmentMatch) {
      return {
        status: 200,
        body: await this.service.unassign(
          request.authorization,
          Number(assignmentMatch[1]),
        ),
      };
    }

    return null;
  }
}
