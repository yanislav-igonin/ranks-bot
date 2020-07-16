import { MessageEntity } from 'telegraf/typings/telegram-types';

import {
  UserMessage,
  UserUpdate,
  UserContext,
} from './UserContext';

interface TextMessage extends UserMessage {
  entities: MessageEntity[];
  text: string;
}

interface TextUpdate extends UserUpdate {
  message: TextMessage;
}

export interface TextContext extends UserContext {
  update: TextUpdate;
}
