import { readFile, stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';

import { AppConfig, TelegramConfig, TgAppConfig } from '../../config';
import { DbModule } from '../db/db.module';
import { LoggerModule } from '../logger.module';
import { TgAppController } from './tg-app.controller';
import { TgAppDao } from './tg-app.dao';
import { TgAppError, TgAppService } from './tg-app.service';

const MAX_JSON_BODY_BYTES = 8192;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

class RequestBodyTooLarge extends Error {}

export interface TgAppServer {
  launch(): Promise<void>;
  close(): Promise<void>;
}

interface TgAppModuleOptions {
  controller: TgAppController;
  port: number;
  staticDirectory?: string;
  logError(error: unknown): void;
  onListening?(port: number): void;
}

const writeJson = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
};

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let size = 0;

  await new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_JSON_BODY_BYTES) {
        request.off('data', onData);
        request.resume();
        reject(new RequestBodyTooLarge());
        return;
      }
      chunks.push(chunk);
    };
    request.on('data', onData);
    request.once('end', resolve);
    request.once('error', reject);
  });

  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new TgAppError(400, 'Invalid JSON body');
  }
};

const firstAuthorizationHeader = (request: IncomingMessage): string | undefined => {
  const value = request.headers.authorization;
  return Array.isArray(value) ? value[0] : value;
};

const safeStaticPath = (staticDirectory: string, pathname: string): string => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new TgAppError(400, 'Invalid path');
  }

  if (
    decoded.includes('\0') ||
    decoded.split('/').some((segment) => segment === '..')
  ) {
    throw new TgAppError(400, 'Invalid path');
  }

  const root = path.resolve(staticDirectory);
  const candidate = path.resolve(root, `.${decoded}`);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new TgAppError(400, 'Invalid path');
  }
  return candidate;
};

const existingFile = async (filename: string): Promise<Buffer | null> => {
  try {
    if (!(await stat(filename)).isFile()) return null;
    return await readFile(filename);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

export const createTgAppModule = ({
  controller,
  port,
  staticDirectory,
  logError,
  onListening,
}: TgAppModuleOptions): TgAppServer => {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const method = request.method ?? 'GET';

      if (method === 'GET' && url.pathname === '/health') {
        writeJson(response, 200, { ok: true });
        return;
      }

      if (url.pathname.startsWith('/api/')) {
        const body = method === 'POST' ? await readJsonBody(request) : undefined;
        const result = await controller.dispatch({
          method,
          pathname: url.pathname,
          authorization: firstAuthorizationHeader(request),
          body,
        });
        if (!result) {
          writeJson(response, 404, { error: 'Not found' });
          return;
        }
        writeJson(response, result.status, result.body);
        return;
      }

      if (method !== 'GET' || !staticDirectory) {
        writeJson(response, 404, { error: 'Not found' });
        return;
      }

      const requestedPath = safeStaticPath(staticDirectory, url.pathname);
      const requestedFile = await existingFile(requestedPath);
      const filename = requestedFile
        ? requestedPath
        : path.join(path.resolve(staticDirectory), 'index.html');
      const body = requestedFile ?? (await existingFile(filename));
      if (!body) {
        writeJson(response, 404, { error: 'Not found' });
        return;
      }

      response.writeHead(200, {
        'content-type':
          MIME_TYPES[path.extname(filename).toLowerCase()] ??
          'application/octet-stream',
      });
      response.end(body);
    } catch (error) {
      if (error instanceof RequestBodyTooLarge) {
        writeJson(response, 413, { error: 'Request body too large' });
        return;
      }
      if (error instanceof TgAppError) {
        writeJson(response, error.status, { error: error.message });
        return;
      }
      logError(error);
      writeJson(response, 500, { error: 'Internal server error' });
    }
  });

  let launchPromise: Promise<void> | undefined;
  let closePromise: Promise<void> | undefined;

  return {
    launch() {
      if (server.listening) return Promise.resolve();
      if (launchPromise) return launchPromise;

      launchPromise = new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => {
          launchPromise = undefined;
          reject(error);
        };
        server.once('error', onError);
        server.listen(port, () => {
          server.off('error', onError);
          const address = server.address();
          if (address && typeof address !== 'string') {
            onListening?.(address.port);
          }
          resolve();
        });
      });
      return launchPromise;
    },

    close() {
      if (closePromise) return closePromise;
      if (!server.listening) return Promise.resolve();

      closePromise = new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      return closePromise;
    },
  };
};

const service = new TgAppService({
  dao: new TgAppDao(DbModule),
  botToken: TelegramConfig.token,
  environment: AppConfig.env,
  devTelegramUserId: TgAppConfig.devTelegramUserId,
});

export const TgAppModule = createTgAppModule({
  controller: new TgAppController(service),
  port: TgAppConfig.port,
  staticDirectory:
    TgAppConfig.staticDirectory ??
    path.resolve(process.cwd(), 'src/tg-app/dist/web'),
  logError: (error) => LoggerModule.error(error),
});
