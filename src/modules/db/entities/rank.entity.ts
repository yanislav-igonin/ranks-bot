import {
  Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, OneToMany,
} from 'typeorm';

// eslint-disable-next-line import/no-cycle
import { RankToUserEntity } from './rank-to-user.entity';

@Entity({ name: 'ranks' })
export class RankEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => RankToUserEntity, (rankToUser) => rankToUser.rank)
  rankToUsers!: RankToUserEntity[];
}
