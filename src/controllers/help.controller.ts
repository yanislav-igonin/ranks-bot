import { Context } from 'telegraf';

export const HelpController = async (ctx: Context): Promise<void> => {
  const helpText = `
/add {rank} - добавляет новое звание. 
/update {rankId} {new_rank} - меняет значение звания (например, если ошибся в слове). 
/delete {rankId} - удалить звание из общего списка.  
/list - вывести список всех званий по пользователям и общий. 
/assign {rankId} {username} {comment} - присваивает звание кому-то из участников чата. Последним аргументом можно дописать комментарий, когда и как было присвоено звание.
/unassign {rankId} {username} - переносит присвоенное звание обратно в список доступных (например, если ошибся в присваивании).
/help - показывает справку.
  `;
  ctx.reply(helpText);
};
