import { Repository } from 'typeorm';
import { DbModule } from '../db.module';
import { RankToUserEntity } from '../entities';

export class RankToUserDao {
  private repository: Repository<RankToUserEntity>;

  constructor() {
    this.repository = DbModule.getRepository(RankToUserEntity);
  }

  async getRanksToUsers() {
    const ranksToUsers = await this.repository.find({
      relations: ['user', 'rank'],
    });
    return ranksToUsers;
  }

  async getRankToUser({ rankId, userId }: { rankId: number; userId: number }) {
    const rankToUser = await this.repository.findOne({
      rank: { id: rankId },
      user: { id: userId },
    });

    if (rankToUser === undefined) { return null; }

    return rankToUser;
  }

  async assignRankToUser(
    {
      userId,
      rankId,
      comment,
    }: {
      userId: number;
      rankId: number;
      comment?: string;
    },
  ) {
    const rankToUser = await this.repository.save({
      user: { id: userId },
      rank: { id: rankId },
      comment,
    });

    return rankToUser;
  }

  async unassignRankToUser(
    {
      userId,
      rankId,
    }: {
      userId: number;
      rankId: number;
    },
  ) {
    await this.repository.delete({
      user: { id: userId },
      rank: { id: rankId },
    });
  }

  async increaseRankCounter(
    { userId, rankId }: { userId: number; rankId: number },
  ) {
    await this.repository.createQueryBuilder()
      .update(RankToUserEntity)
      .where({ user: { id: userId }, rank: { id: rankId } })
      .set({ count: (): string => 'count + 1' })
      .execute();
  }

  async decreaseRankCounter(
    { userId, rankId }: { userId: number; rankId: number },
  ) {
    await this.repository.createQueryBuilder()
      .update(RankToUserEntity)
      .where({ user: { id: userId }, rank: { id: rankId } })
      .set({ count: (): string => 'count - 1' })
      .execute();
  }
}
