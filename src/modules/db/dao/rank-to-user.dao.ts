import { Repository } from 'typeorm';
import { DbModule } from '../db.module';
import { RankToUserEntity } from '../entities';

export class RankToUserDao {
  private repository: Repository<RankToUserEntity>;

  public constructor() {
    this.repository = DbModule.getRepository(RankToUserEntity);
  }

  public async getRanksToUsers(): Promise<RankToUserEntity[]> {
    const ranksToUsers = await this.repository.find({
      relations: ['user', 'rank'],
    });
    return ranksToUsers;
  }

  public async getRankToUser(
    { rankId, userId }: { rankId: number; userId: number },
  ): Promise<RankToUserEntity | null> {
    const rankToUser = await this.repository.findOne({
      rank: { id: rankId },
      user: { id: userId },
    });

    if (rankToUser === undefined) { return null; }

    return rankToUser;
  }

  public async assignRankToUser(
    {
      userId,
      rankId,
      comment,
    }: {
      userId: number;
      rankId: number;
      comment?: string;
    },
  ): Promise<RankToUserEntity> {
    const rankToUser = await this.repository.save({
      user: { id: userId },
      rank: { id: rankId },
      comment,
    });

    return rankToUser;
  }

  public async unassignRankToUser(
    {
      userId,
      rankId,
    }: {
      userId: number;
      rankId: number;
    },
  ): Promise<void> {
    await this.repository.delete({
      user: { id: userId },
      rank: { id: rankId },
    });
  }

  public async increaseRankCounter(
    { userId, rankId }: { userId: number; rankId: number },
  ): Promise<void> {
    await this.repository.createQueryBuilder()
      .update(RankToUserEntity)
      .where({ user: { id: userId }, rank: { id: rankId } })
      .set({ count: (): string => 'count + 1' })
      .execute();
  }

  public async decreaseRankCounter(
    { userId, rankId }: { userId: number; rankId: number },
  ): Promise<void> {
    await this.repository.createQueryBuilder()
      .update(RankToUserEntity)
      .where({ user: { id: userId }, rank: { id: rankId } })
      .set({ count: (): string => 'count - 1' })
      .execute();
  }
}
