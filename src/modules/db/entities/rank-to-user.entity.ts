import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { RankEntity } from './rank.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'ranks_to_users' })
export class RankToUserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: '' })
  comment!: string;

  @Column({ default: 1 })
  count!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(
    () => RankEntity,
    (rank) => rank.rankToUsers,
  )
  rank!: RankEntity;

  @ManyToOne(
    () => UserEntity,
    (user) => user.rankToUsers,
  )
  user!: UserEntity;
}
