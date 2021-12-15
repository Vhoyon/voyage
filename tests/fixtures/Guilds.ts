import { Guild, PrismaClient } from '@prisma/client';
import f from 'faker';
import { Fixture, LinkMethod, upsertRange } from 'prisma-fixtures';

export default class GuildFixture extends Fixture<Guild> {
	override dependencies = [];

	override async seed(prisma: PrismaClient, _link: LinkMethod<this>): Promise<Guild[]> {
		f.seed(123456789);

		const guilds = await upsertRange(prisma.guild.upsert, 3, (current) => {
			const guildId = [...Array(18)].map(() => f.datatype.number(9)).join();

			return {
				create: {
					guildId,
				},
				update: {},
				where: {
					id: current,
				},
			};
		});

		return guilds;
	}
}
