import { getConnectionManager } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { DbConfig } from '../../config';
import {
  RankEntity,
  UserEntity,
  RankToUserEntity,
  ChangelogEntity,
} from './entities';

import { SeedInitialData1594905684546 } from './seeds';

const connectionManager = getConnectionManager();
const connection = connectionManager.create({
  type: 'postgres',
  entities: [RankEntity, UserEntity, RankToUserEntity, ChangelogEntity],
  migrations: [SeedInitialData1594905684546],
  migrationsRun: true,
  ...DbConfig,
  namingStrategy: new SnakeNamingStrategy(),
});

export { connection as DbModule };
