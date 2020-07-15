import { getConnectionManager } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { DbConfig } from '../../config';
import {
  RankEntity,
  UserEntity,
  RankToUserEntity,
} from './entities';

const connectionManager = getConnectionManager();
const connection = connectionManager.create({
  type: 'postgres',
  entities: [RankEntity, UserEntity, RankToUserEntity],
  ...DbConfig,
  namingStrategy: new SnakeNamingStrategy(),
});

export { connection as DbModule };
