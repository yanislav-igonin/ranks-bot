import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from './user.entity';

@Entity({ name: 'changelogs' })
export class ChangelogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column()
  type!: string;

  @Column()
  table!: string;

  @Column()
  objectId!: number;

  @Column({ default: '' })
  previousValue!: string;

  @Column({ default: '' })
  currentValue!: string;

  @ManyToOne(
    () => UserEntity,
    (user) => user.changelogs,
  )
  user!: UserEntity;
}
