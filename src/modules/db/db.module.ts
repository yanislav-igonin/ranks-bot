import { DataSource } from 'typeorm';

import { DbConfig } from '../../config';
import {
  ChangelogEntity,
  RankEntity,
  RankToUserEntity,
  UserEntity,
} from './entities';

import { SeedInitialData1594905684546 } from './seeds';
import { SnakeNamingStrategy } from './snake-naming.strategy';

const DbModule = new DataSource({
  type: 'postgres',
  entities: [RankEntity, UserEntity, RankToUserEntity, ChangelogEntity],
  migrations: [SeedInitialData1594905684546],
  ...DbConfig,
  namingStrategy: new SnakeNamingStrategy(),
});

export { DbModule };
