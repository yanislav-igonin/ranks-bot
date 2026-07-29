import 'reflect-metadata';
import { AppConfig } from './config';
import { BotModule, DbModule, LoggerModule, TgAppModule } from './modules';

interface ApplicationModules {
  db: {
    initialize(): Promise<unknown>;
    runMigrations(): Promise<unknown>;
    destroy(): Promise<unknown>;
  };
  bot: {
    launch(): Promise<void>;
    close(reason?: string): Promise<void>;
  };
  tgApp: {
    launch(): Promise<void>;
    close(): Promise<void>;
  };
}

export const launchApplication = async ({
  db,
  bot,
  tgApp,
}: ApplicationModules): Promise<void> => {
  await db.initialize();
  await db.runMigrations();
  try {
    await Promise.all([bot.launch(), tgApp.launch()]);
  } catch (error) {
    await Promise.allSettled([
      bot.close('startup failure'),
      tgApp.close(),
      db.destroy(),
    ]);
    throw error;
  }
};

const main = async (): Promise<void> => {
  LoggerModule.info({ release: AppConfig.release }, 'release');

  let shutdownPromise: Promise<void> | undefined;
  const shutdown = (reason: string): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      await Promise.allSettled([BotModule.close(reason), TgAppModule.close()]);
      if (DbModule.isInitialized) {
        await DbModule.destroy();
      }
    })();
    return shutdownPromise;
  };

  const handleSignal = (signal: NodeJS.Signals) => {
    void shutdown(signal).catch((error) => LoggerModule.error(error));
  };
  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);

  await launchApplication({
    db: DbModule,
    bot: BotModule,
    tgApp: TgAppModule,
  });
  LoggerModule.info('bot and Telegram Mini App online');
};

if (require.main === module) {
  void main().catch((error: Error) => {
    LoggerModule.error(error);
    process.exitCode = 1;
  });
}
