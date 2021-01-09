import { Repository } from 'typeorm';
import { DbModule } from '../db.module';
import { UserEntity } from '../entities';

export class UserDao {
  private repository: Repository<UserEntity>;

  constructor() {
    this.repository = DbModule.getRepository(UserEntity);
  }

  async getUsers() {
    const users = await this.repository.find();
    return users;
  }

  async getUserByUsername({ username }: { username: string }) {
    const user = await this.repository.findOne({ username });

    if (user === undefined) { return null; }

    return user;
  }
}
