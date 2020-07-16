import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne,
} from 'typeorm';

// eslint-disable-next-line import/no-cycle
import { RankEntity } from './rank.entity';
// eslint-disable-next-line import/no-cycle
import { UserEntity } from './user.entity';

@Entity({ name: 'ranks_to_users' })
export class RankToUserEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column({ default: '' })
  public comment!: string;

  @Column({ default: 1 })
  public count!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt!: Date;

  @ManyToOne((type) => RankEntity, (rank) => rank.rankToUsers)
  public rank!: RankEntity;

  @ManyToOne((type) => UserEntity, (user) => user.rankToUsers)
  public user!: UserEntity;
}
