import { Repository } from 'typeorm';
import { DbModule } from '../db.module';
import { RankEntity } from '../entities';

export class RankDao {
  private repository: Repository<RankEntity>;

  public constructor() {
    this.repository = DbModule.getRepository(RankEntity);
  }

  public async getRanks(): Promise<RankEntity[]> {
    const ranks = await this.repository.find();
    return ranks;
  }

  public async getRank({ id }: { id: number }): Promise<RankEntity | null> {
    const rank = await this.repository.findOne(id);

    if (rank === undefined) { return null; }

    return rank;
  }

  public async createRank({ title }: { title: string }): Promise<RankEntity> {
    const rank = await this.repository.save({ title });
    return rank;
  }

  public async deleteRank({ id }: { id: number }): Promise<void> {
    await this.repository.delete({ id });
  }

  public async updateRank(
    { id, title }: { id: number; title: string },
  ): Promise<void> {
    await this.repository.update(id, { title });
  }
}
