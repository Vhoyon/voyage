import NodeEnvironment from 'jest-environment-node';
import { env } from '../src/config.module';

export class PrismaTestEnvironment extends NodeEnvironment {
	override async setup() {
		const dbURL = process.env.TEST_DATABASE_URL ?? env.TEST_DATABASE_URL;

		process.env.DATABASE_URL = dbURL;
		(<any>this.global.process).env.DATABASE_URL = dbURL;

		return super.setup();
	}
}

export default PrismaTestEnvironment;
