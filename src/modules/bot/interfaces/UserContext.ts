import { Context } from 'telegraf';
import {
  Message, Update, User,
} from 'telegram-typings';

export interface UserMessage extends Message {
  from: User;
}

export interface UserUpdate extends Update {
  message: UserMessage;
}

export interface UserContext extends Context {
  update: UserUpdate;
}
