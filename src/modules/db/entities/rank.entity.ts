import {
  Entity, Column, CreateDateColumn, PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'ranks' })
export class RankEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column({ name: 'title' })
  public type!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  public createdAt!: Date;
}
