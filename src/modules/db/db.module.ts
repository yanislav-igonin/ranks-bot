import { getConnectionManager } from 'typeorm';

import { DbConfig } from '../../config';
import {
  RankEntity,
  UserEntity,
} from './entities';

const connectionManager = getConnectionManager();
const connection = connectionManager.create({
  type: 'postgres',
  entities: [RankEntity, UserEntity],
  ...DbConfig,
});

export { connection as DbModule };
