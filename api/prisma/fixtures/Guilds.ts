import { Guild, PrismaClient } from '@prisma/client';
import { Fixture, LinkMethod } from 'prisma-fixtures';

export default class GuildFixture extends Fixture<Guild> {
	override dependencies = [];

	override async seed(_prisma: PrismaClient, _link: LinkMethod<this>): Promise<Guild[]> {
		// const messages = await createMany(
		// 	prisma.message.create,
		// 	{
		// 		text: 'First messages',
		// 		user: {
		// 			connect: {
		// 				username: 'V-ed',
		// 			},
		// 		},
		// 	},
		// 	(index) => ({
		// 		text: 'Hello!',
		// 		userId: link(UserFixture, index).id,
		// 	}),
		// );

		// return messages;

		return [];
	}
}
