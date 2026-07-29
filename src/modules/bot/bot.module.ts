import * as ngrok from 'ngrok';
import { Telegraf } from 'telegraf';

import * as Config from '../../config';
import {
  AddController,
  AssignController,
  ChangelogController,
  DeleteController,
  HelpController,
  ListController,
  StartController,
  UnassignController,
  UpdateController,
} from '../../controllers';
import { AuthMiddleware } from '../../middlewares';
import { LoggerModule } from '../logger.module';
import type { TextContext } from './interfaces/index';

class BotModule {
  private config: typeof Config;

  constructor(config: typeof Config) {
    this.config = config;
  }

  async launch() {
    const { AppConfig, TelegramConfig } = this.config;

    const bot = new Telegraf<TextContext>(TelegramConfig.token);

    bot.catch((err): void => {
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
      if (ctx.update.message.text.toLowerCase().split(' ').includes('да')) {
        // TODO: переделать в регулярку
        await ctx.reply('пизда');
      }
    });

    if (TelegramConfig.webhook.isEnabled) {
      let host: string;
      if (AppConfig.env === 'development') {
        host = await ngrok.connect(TelegramConfig.webhook.port);
      } else {
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
      await bot.launch();

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
