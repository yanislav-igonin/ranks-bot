import { MigrationInterface, QueryRunner, getRepository } from 'typeorm';
import { UserEntity, RankEntity, RankToUserEntity } from '../entities';

export class SeedInitialData1594905684546 implements MigrationInterface {
  private users: {id: number; username: string}[];

  public constructor() {
    this.users = [
      {
        id: 142166671,
        username: 'hobo_with_a_hookah',
      },
      {
        id: 546166718,
        username: 'Noeter',
      },
      {
        id: 383288860,
        username: 'ConeConundrum',
      },
    ];
  }

  public async up(): Promise<void> {
    const userRepository = getRepository(UserEntity);
    await userRepository.save(this.users);
  }

  public async down(): Promise<void> {
    const userRepository = getRepository(UserEntity);
    const userIds = this.users.map((u): number => u.id);
    const users = await userRepository.findByIds(userIds);
    await userRepository.remove(users);
  }
}
