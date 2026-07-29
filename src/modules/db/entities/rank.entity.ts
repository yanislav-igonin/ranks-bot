import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { RankToUserEntity } from './rank-to-user.entity';

@Entity({ name: 'ranks' })
export class RankEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    () => RankToUserEntity,
    (rankToUser) => rankToUser.rank,
  )
  rankToUsers!: RankToUserEntity[];
}
