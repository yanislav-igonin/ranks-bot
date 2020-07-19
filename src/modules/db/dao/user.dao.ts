import { Repository } from 'typeorm';
import { DbModule } from '../db.module';
import { UserEntity } from '../entities';

export class UserDao {
  private repository: Repository<UserEntity>;

  public constructor() {
    this.repository = DbModule.getRepository(UserEntity);
  }

  public async getUsers(): Promise<UserEntity[]> {
    const users = await this.repository.find();
    return users;
  }

  public async getUserByUsername(
    { username }: { username: string },
  ): Promise<UserEntity | null> {
    const user = await this.repository.findOne({ username });

    if (user === undefined) { return null; }

    return user;
  }
}
