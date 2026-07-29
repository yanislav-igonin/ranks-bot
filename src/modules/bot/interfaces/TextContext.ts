import type { Context, NarrowedContext } from 'telegraf';
import type { Message, Update } from 'telegraf/types';

export type TextContext = NarrowedContext<
  Context,
  Update.MessageUpdate<Message.TextMessage>
>;
