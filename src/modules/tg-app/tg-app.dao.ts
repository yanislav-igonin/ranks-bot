import type { DataSource } from 'typeorm';

import { DbModule } from '../db/db.module';
import {
  ChangelogEntity,
  RankEntity,
  RankToUserEntity,
  UserEntity,
} from '../db/entities';
import { TgAppError, type TgAppDaoPort } from './tg-app.service';

export class TgAppDao implements TgAppDaoPort {
  constructor(private readonly dataSource: DataSource = DbModule) {}

  async getState() {
    const rankRepository = this.dataSource.getRepository(RankEntity);
    const assignmentRepository = this.dataSource.getRepository(RankToUserEntity);

    const [availableRanks, assignments] = await Promise.all([
      rankRepository
        .createQueryBuilder('rank')
        .where((query) => {
          const assigned = query
            .subQuery()
            .select('1')
            .from(RankToUserEntity, 'assignment')
            .where('assignment.rank_id = rank.id')
            .getQuery();
          return `NOT EXISTS ${assigned}`;
        })
        .orderBy('rank.id', 'ASC')
        .getMany(),
      assignmentRepository.find({
        relations: { rank: true, user: true },
        order: { user: { id: 'ASC' }, rank: { id: 'ASC' } },
      }),
    ]);

    return { availableRanks, assignments };
  }

  async assignRank({
    rankId,
    recipientId,
    actorId,
  }: {
    rankId: number;
    recipientId: number;
    actorId: number;
  }): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const rankRepository = manager.getRepository(RankEntity);
      const assignmentRepository = manager.getRepository(RankToUserEntity);
      const userRepository = manager.getRepository(UserEntity);
      const changelogRepository = manager.getRepository(ChangelogEntity);

      const rank = await rankRepository.findOne({
        where: { id: rankId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!rank) {
        throw new TgAppError(404, 'Rank not found');
      }

      const existing = await assignmentRepository.findOne({
        where: { rank: { id: rankId } },
      });
      if (existing) {
        throw new TgAppError(409, 'Rank is already assigned');
      }

      const recipient = await userRepository.findOneBy({ id: recipientId });
      const actor = await userRepository.findOneBy({ id: actorId });
      if (!recipient) {
        throw new TgAppError(400, 'Invalid recipient');
      }
      if (!actor) {
        throw new TgAppError(401, 'User is not allowed');
      }

      const assignment = await assignmentRepository.save({
        rank,
        user: recipient,
        comment: '',
        count: 1,
      });
      await changelogRepository.save({
        type: 'insert',
        table: 'ranks_to_users',
        objectId: assignment.id,
        user: actor,
        currentValue: rank.title,
      });
    });
  }
}
