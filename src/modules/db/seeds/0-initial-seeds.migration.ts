import { MigrationInterface, getRepository } from 'typeorm';
import { UserEntity, RankEntity, RankToUserEntity } from '../entities';

export class SeedInitialData1594905684546 implements MigrationInterface {
  private users: {id: number; username: string}[];

  private ranks: {id: number; title: string}[];

  private ranksToUsers: {user: {id: number}; rank: {id: number}; count?: number}[];

  constructor() {
    this.users = [
      { id: 142166671, username: 'hobo_with_a_hookah' },
      { id: 546166718, username: 'Noeter' },
      { id: 383288860, username: 'ConeConundrum' },
    ];

    this.ranks = [
      // Марк
      { id: 1, title: 'Стоянов' },
      { id: 2, title: 'Ствол' },
      { id: 3, title: 'Лишний ствол' },
      { id: 4, title: 'Пепе' },
      { id: 5, title: 'Коляска' },
      { id: 6, title: 'Отличник' },
      { id: 7, title: 'Педаль борду' },
      { id: 8, title: 'Имбирный' },
      { id: 9, title: 'Половое побоище' },
      { id: 10, title: 'Бадяга' },
      { id: 11, title: 'Мокрогол' },
      { id: 12, title: 'Сало печали' },
      { id: 13, title: 'Разогревочный' },
      { id: 14, title: 'Блиндед' },
      { id: 15, title: 'Блиндон' },
      { id: 16, title: 'Око ужаса' },
      { id: 17, title: 'Кислые щи' },
      { id: 18, title: 'Натшот' },
      { id: 19, title: 'Фагот' },
      { id: 20, title: 'Сливник' },
      { id: 21, title: 'Яичник' },
      { id: 22, title: 'Радикулит' },
      { id: 23, title: 'Приемный' },
      { id: 24, title: 'Седалище' },
      { id: 25, title: 'Тухлый дроп' },

      // Серега
      { id: 26, title: 'Куколд' },
      { id: 27, title: 'Кацап' },
      { id: 28, title: 'Уздечка' },
      { id: 29, title: 'Бобби' },
      { id: 30, title: 'Дилдер' },
      { id: 31, title: 'Смегма' },
      { id: 32, title: 'Соленый' },
      { id: 33, title: 'Слоды' },
      { id: 34, title: 'Камминг аут' },
      { id: 35, title: 'Урина' },
      { id: 36, title: 'Блинда' },
      { id: 37, title: 'Пубертат' },
      { id: 38, title: 'Кокпит' },
      { id: 39, title: 'Климакс' },
      { id: 40, title: 'Ходок' },
      { id: 41, title: 'Менопауза' },
      { id: 42, title: 'Долдонт' },
      { id: 43, title: 'Отличник' },
      { id: 44, title: 'Вульва' },
      { id: 45, title: 'Рахит' },
      { id: 46, title: 'Дилдокинг' },
      { id: 47, title: 'Говяжий анус' },
      { id: 48, title: 'Дифичент' },
      { id: 49, title: 'Буккаке' },

      // Ян
      { id: 50, title: 'Лежалый' },
      { id: 51, title: 'Голландский штурвал' },
      { id: 52, title: 'Отличник' },
      { id: 53, title: 'Свиная шея' },
      { id: 54, title: 'Спермота' },
      { id: 55, title: 'Компьютерный спермобак' },
      { id: 56, title: 'Моряк' },
      { id: 57, title: 'Унтерменш' },
      { id: 58, title: 'Клитор' },
      { id: 59, title: 'Киста' },
      { id: 60, title: 'Траншея' },
      { id: 61, title: 'Прямая кишка' },
      { id: 62, title: 'Брюшной тиф' },
      { id: 63, title: 'Лишний Гешефт' },
      { id: 64, title: 'Утомленный Выбросом' },

      // Розыгрыш
      { id: 65, title: 'Кукурузный макрогол' },
      { id: 66, title: 'Обугленный' },
      { id: 67, title: 'Задержка' },
      { id: 68, title: 'Стружка' },
      { id: 69, title: 'Грыжа' },
      { id: 70, title: 'Газонюх' },
      { id: 71, title: 'Выкидыш' },
      { id: 72, title: 'Бездомный' },
      { id: 73, title: 'Залупсон' },
      { id: 74, title: 'Полупокер' },
      { id: 75, title: 'Ковид' },
      { id: 76, title: 'Плебс' },
      { id: 77, title: 'Микроб' },
      { id: 78, title: 'Клоп' },
      { id: 79, title: 'Блоха' },
      { id: 80, title: 'Пёс' },
      { id: 81, title: 'Бибос' },
      { id: 82, title: 'Овощ' },
      { id: 83, title: 'Пенсионер' },
      { id: 84, title: 'Бесполезник' },
      { id: 85, title: 'Клоун' },
      { id: 86, title: 'Шлепок' },
      { id: 87, title: 'Жижа' },
      { id: 88, title: 'Рот бомжа' },
    ];

    this.ranksToUsers = [
      { user: { id: 546166718 }, rank: { id: 1 } },
      { user: { id: 546166718 }, rank: { id: 2 } },
      { user: { id: 546166718 }, rank: { id: 3 } },
      { user: { id: 546166718 }, rank: { id: 4 } },
      { user: { id: 546166718 }, rank: { id: 5 } },
      { user: { id: 546166718 }, rank: { id: 6 }, count: 5 },
      { user: { id: 546166718 }, rank: { id: 7 } },
      { user: { id: 546166718 }, rank: { id: 8 } },
      { user: { id: 546166718 }, rank: { id: 9 } },
      { user: { id: 546166718 }, rank: { id: 10 } },
      { user: { id: 546166718 }, rank: { id: 11 } },
      { user: { id: 546166718 }, rank: { id: 12 } },
      { user: { id: 546166718 }, rank: { id: 13 } },
      { user: { id: 546166718 }, rank: { id: 14 } },
      { user: { id: 546166718 }, rank: { id: 15 } },
      { user: { id: 546166718 }, rank: { id: 16 } },
      { user: { id: 546166718 }, rank: { id: 17 } },
      { user: { id: 546166718 }, rank: { id: 18 } },
      { user: { id: 546166718 }, rank: { id: 19 } },
      { user: { id: 546166718 }, rank: { id: 20 } },
      { user: { id: 546166718 }, rank: { id: 21 } },
      { user: { id: 546166718 }, rank: { id: 22 } },
      { user: { id: 546166718 }, rank: { id: 23 } },
      { user: { id: 546166718 }, rank: { id: 24 } },
      { user: { id: 546166718 }, rank: { id: 25 } },
      { user: { id: 383288860 }, rank: { id: 26 }, count: 2 },
      { user: { id: 383288860 }, rank: { id: 27 } },
      { user: { id: 383288860 }, rank: { id: 28 } },
      { user: { id: 383288860 }, rank: { id: 29 } },
      { user: { id: 383288860 }, rank: { id: 30 } },
      { user: { id: 383288860 }, rank: { id: 31 } },
      { user: { id: 383288860 }, rank: { id: 32 } },
      { user: { id: 383288860 }, rank: { id: 33 } },
      { user: { id: 383288860 }, rank: { id: 34 } },
      { user: { id: 383288860 }, rank: { id: 35 } },
      { user: { id: 383288860 }, rank: { id: 36 } },
      { user: { id: 383288860 }, rank: { id: 37 } },
      { user: { id: 383288860 }, rank: { id: 38 } },
      { user: { id: 383288860 }, rank: { id: 39 } },
      { user: { id: 383288860 }, rank: { id: 40 } },
      { user: { id: 383288860 }, rank: { id: 41 } },
      { user: { id: 383288860 }, rank: { id: 42 } },
      { user: { id: 383288860 }, rank: { id: 43 } },
      { user: { id: 383288860 }, rank: { id: 44 } },
      { user: { id: 383288860 }, rank: { id: 45 } },
      { user: { id: 383288860 }, rank: { id: 46 } },
      { user: { id: 383288860 }, rank: { id: 47 } },
      { user: { id: 383288860 }, rank: { id: 48 } },
      { user: { id: 383288860 }, rank: { id: 49 } },
      { user: { id: 142166671 }, rank: { id: 50 } },
      { user: { id: 142166671 }, rank: { id: 51 } },
      { user: { id: 142166671 }, rank: { id: 52 } },
      { user: { id: 142166671 }, rank: { id: 53 } },
      { user: { id: 142166671 }, rank: { id: 54 } },
      { user: { id: 142166671 }, rank: { id: 55 } },
      { user: { id: 142166671 }, rank: { id: 56 } },
      { user: { id: 142166671 }, rank: { id: 57 } },
      { user: { id: 142166671 }, rank: { id: 58 } },
      { user: { id: 142166671 }, rank: { id: 59 } },
      { user: { id: 142166671 }, rank: { id: 60 } },
      { user: { id: 142166671 }, rank: { id: 61 } },
      { user: { id: 142166671 }, rank: { id: 62 } },
      { user: { id: 142166671 }, rank: { id: 63 } },
      { user: { id: 142166671 }, rank: { id: 64 } },
    ];
  }


  async up(): Promise<void> {
    const userRepository = getRepository(UserEntity);
    await userRepository.save(this.users);

    const rankRepository = getRepository(RankEntity);
    await rankRepository.save(this.ranks);

    const rankToUserRepository = getRepository(RankToUserEntity);
    await rankToUserRepository.save(this.ranksToUsers);
  }

  async down(): Promise<void> {
    const userRepository = getRepository(UserEntity);
    const userIds = this.users.map((u): number => u.id);
    const users = await userRepository.findByIds(userIds);
    await userRepository.remove(users);

    const rankRepository = getRepository(RankEntity);
    const rankIds = this.ranks.map((r): number => r.id);
    const ranks = await rankRepository.findByIds(rankIds);
    await rankRepository.remove(ranks);

    const rankToUserRepository = getRepository(RankEntity);
    const ranksToUsers = await rankToUserRepository.find();
    await rankToUserRepository.remove(ranksToUsers);
  }
}
