import { Repository } from 'typeorm';
import { DbModule } from '../db.module';
import { RankEntity } from '../entities';

export class RankDao {
  private repository: Repository<RankEntity>;

  constructor() {
    this.repository = DbModule.getRepository(RankEntity);
  }

  async getRanks() {
    const ranks = await this.repository.find();
    return ranks;
  }

  async getRank({ id }: { id: number }) {
    const rank = await this.repository.findOne(id);

    if (rank === undefined) { return null; }

    return rank;
  }

  async createRank({ title }: { title: string }) {
    const rank = await this.repository.save({ title });
    return rank;
  }

  async deleteRank({ id }: { id: number }) {
    await this.repository.delete({ id });
  }

  async updateRank({ id, title }: { id: number; title: string }) {
    await this.repository.update(id, { title });
  }
}
