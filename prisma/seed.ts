import { seed } from './functions';

async function runCliSeeds() {
	const seedData = await seed();

	const formattedData = seedData.map((data) => ({
		fixture: data.name,
		modelsCount: data.models.length,
	}));

	console.log(`Seed data :`, formattedData);
}

runCliSeeds();
