import ngrok from '@ngrok/ngrok';
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
  private bot?: Telegraf<TextContext>;

  constructor(config: typeof Config) {
    this.config = config;
  }

  async launch() {
    const { AppConfig, TelegramConfig } = this.config;

    const bot = new Telegraf<TextContext>(TelegramConfig.token);
    this.bot = bot;

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
        const listener = await ngrok.forward({
          addr: TelegramConfig.webhook.port,
          authtoken_from_env: true,
        });
        const listenerUrl = listener.url();
        if (!listenerUrl) {
          throw new Error('ngrok did not provide a public URL');
        }
        host = listenerUrl;
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
    } else {
      await bot.telegram.deleteWebhook();
      await bot.launch();

      LoggerModule.info(`bot - online`);
    }
  }

  async sendGroupMessage(text: string): Promise<void> {
    if (!this.bot) {
      throw new Error('Telegram bot is not running');
    }
    await this.bot.telegram.sendMessage(-1001230506485, text);
  }

  async close(reason = 'application shutdown'): Promise<void> {
    const bot = this.bot;
    this.bot = undefined;
    bot?.stop(reason);
  }
}

const botModule = new BotModule(Config);

export { botModule as BotModule };
