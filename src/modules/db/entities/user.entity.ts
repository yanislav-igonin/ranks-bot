import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ChangelogEntity } from './changelog.entity';
import { RankToUserEntity } from './rank-to-user.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ unique: true })
  id!: number;

  @Column({ default: '' })
  username!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(
    () => RankToUserEntity,
    (rankToUser) => rankToUser.user,
  )
  rankToUsers!: RankToUserEntity[];

  @OneToMany(
    () => ChangelogEntity,
    (changelog) => changelog.user,
  )
  changelogs!: ChangelogEntity[];
}
