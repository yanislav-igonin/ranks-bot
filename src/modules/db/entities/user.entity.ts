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
  id!: number;

  @Column({ default: '' })
  username!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => RankToUserEntity, (rankToUser) => rankToUser.user)
  rankToUsers!: RankToUserEntity[];

  @OneToMany(() => ChangelogEntity, (changelog) => changelog.user)
  changelogs!: ChangelogEntity[];
}
