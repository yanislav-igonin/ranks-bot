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
  ChangelogController,
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
    bot.command(['release', 'release@RanksBot'], async (ctx): Promise<void> => {
      await ctx.reply(AppConfig.release);
    });
    bot.command(['changelog', 'changelog@RanksBot'], ChangelogController);
    bot.on('text', async (ctx): Promise<void> => {
      if (ctx.update.message.text.toLowerCase().split(' ').includes('да')) { // TODO: переделать в регулярку
        await ctx.reply('пизда');
      }
    });

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

      if (AppConfig.env === 'production') {
        await bot.telegram.sendMessage(
          -1001230506485,
          `Стартую ебать, релиз - ${AppConfig.release}`,
        );
      }
    } else {
      await bot.telegram.deleteWebhook();
      bot.startPolling();

      if (AppConfig.env === 'production') {
        await bot.telegram.sendMessage(
          -1001230506485,
          `Стартую ебать, релиз - ${AppConfig.release}`,
        );
      }
    }
  }
}

const botModule = new BotModule(Config);

export { botModule as BotModule };
