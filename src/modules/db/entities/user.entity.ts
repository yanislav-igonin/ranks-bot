import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ unique: true })
  public id!: number;

  @Column({ default: '' })
  public username!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  public createdAt!: Date;
}
