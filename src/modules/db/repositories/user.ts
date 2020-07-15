import { User as UserData } from 'telegram-typings';

import db from '../db.module';
import { User } from '../entities';

export const getUser = async (id: number): Promise<User | undefined> => {
  const userRepository = db.getRepository(User);
  const user = await userRepository.findOne(id);
  return user;
};

export const createUser = async (data: UserData): Promise<User> => {
  const userRepository = db.getRepository(User);
  const user = new User();
  user.id = data.id;
  user.isBot = data.is_bot;
  user.firstName = data.first_name;
  user.lastName = data.last_name || '';
  user.username = data.username || '';
  user.languageCode = data.language_code || '';
  await userRepository.save(user);
  return user;
};

export const getAllUsersIdsAndLanguageCodes = async (): Promise<User[]> => {
  const userRepository = db.getRepository(User);
  return userRepository.find({ select: ['id', 'languageCode'] });
};
