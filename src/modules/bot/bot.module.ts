import Telegraf from 'telegraf';
import * as ngrok from 'ngrok';

import * as Config from '../../config';
import { LoggerModule } from '../logger.module';
import {
  StartController,
  AddController,
  AssignController,
  DeleteController,
  HelpController,
  ListController,
  UnassignController,
  UpdateController,
} from '../../controllers';

import { TextContext } from './interfaces/index';
import { AuthMiddleware } from '../../middlewares';

class BotModule {
  private config: typeof Config;

  public constructor(config: typeof Config) {
    this.config = config;
  }

  public async launch(): Promise<void> {
    const { AppConfig, TelegramConfig } = this.config;

    const bot = new Telegraf<TextContext>(TelegramConfig.token);

    bot.catch((err: Error): void => {
      LoggerModule.error(`ERROR: ${err}\n`);
    });

    bot.use(AuthMiddleware);

    bot.start(StartController);
    bot.command(['add', 'add@RanksBot'], AddController);
    bot.command(['assign', 'assign@RanksBot'], AssignController);
    bot.command(['delete', 'delete@RanksBot'], DeleteController);
    bot.command(['list', 'list@RanksBot'], ListController);
    bot.command(['unassign', 'unassign@RanksBot'], UnassignController);
    bot.command(['update', 'update@RanksBot'], UpdateController);
    bot.command(['help', 'help@RanksBot'], HelpController);

    if (TelegramConfig.webhook.isEnabled) {
      let host: string;
      if (AppConfig.env === 'development') {
        host = await ngrok.connect(TelegramConfig.webhook.port);
      } else {
      // eslint-disable-next-line prefer-destructuring
        host = TelegramConfig.webhook.host;
      }

      await bot.launch({
        webhook: {
          domain: host,
          hookPath: TelegramConfig.webhook.path,
          port: TelegramConfig.webhook.port,
        },
      });
    } else {
      await bot.telegram.deleteWebhook();
      bot.startPolling();
    }
  }
}

const botModule = new BotModule(Config);

export { botModule as BotModule };