increaseRankCounterincreaseRankCounterimport { Repository } from 'typeorm';
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

  public async increaseRankCounter(
    { userId, rankId }: { userId: number; rankId: number},
  ): Promise<RankToUserEntity | null> {
    const rank = await this.repository.findOne({
      user: { id: userId }, rank: { id: rankId },
    });
    if (rank !== undefined) {
      rank.count += 1;
      await this.repository.save(rank);
      return rank;
    }

    return null;
  }
}
