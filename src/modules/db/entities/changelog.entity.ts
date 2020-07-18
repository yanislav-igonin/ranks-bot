import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne,
} from 'typeorm';

// eslint-disable-next-line import/no-cycle
import { UserEntity } from './user.entity';

@Entity({ name: 'changelogs' })
export class ChangelogEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt!: Date;

  @Column()
  public type!: string;

  @Column()
  public table!: string;

  @Column()
  public objectId!: number;

  @Column({ default: '' })
  public previousValue!: string;

  @Column({ default: '' })
  public currentValue!: string;

  @ManyToOne((type) => UserEntity, (user) => user.changelogs)
  public user!: UserEntity;
}
