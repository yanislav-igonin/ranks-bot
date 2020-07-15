import 'reflect-metadata';
import { AppConfig } from './config';
import { LoggerModule, BotModule, DbModule } from './modules';

const launch = async (): Promise<void> => {
  LoggerModule.info('release -', AppConfig.release);
  await DbModule.connect();
  LoggerModule.info('db - connection - success');
  await BotModule.launch();
  LoggerModule.info('bot - online');
};

launch()
  .then((): void => LoggerModule.info('all systems nominal'))
  .catch((err: Error): void => {
    LoggerModule.error('bot - offline');
    LoggerModule.error(err);
  });
