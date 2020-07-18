import {
  Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany,
} from 'typeorm';

// eslint-disable-next-line import/no-cycle
import { RankToUserEntity } from './rank-to-user.entity';
// eslint-disable-next-line import/no-cycle
import { ChangelogEntity } from './changelog.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ unique: true })
  public id!: number;

  @Column({ default: '' })
  public username!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt!: Date;

  @OneToMany((type) => RankToUserEntity, (rankToUser) => rankToUser.user)
  public rankToUsers!: RankToUserEntity[];

  @OneToMany((type) => ChangelogEntity, (changelog) => changelog.user)
  public changelogs!: ChangelogEntity[];
}
