import {
  Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, OneToMany,
} from 'typeorm';

// eslint-disable-next-line import/no-cycle
import { RankToUserEntity } from './rank-to-user.entity';

@Entity({ name: 'ranks' })
export class RankEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public title!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt!: Date;

  @OneToMany((type) => RankToUserEntity, (rankToUser) => rankToUser.rank)
  public rankToUsers!: RankToUserEntity[];
}
