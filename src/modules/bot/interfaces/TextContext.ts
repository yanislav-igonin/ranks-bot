import type { MessageEntity } from 'telegram-typings';

import type { UserContext, UserMessage, UserUpdate } from './UserContext';

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
