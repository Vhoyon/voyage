import swc from 'unplugin-swc';
import { configDefaults } from 'vitest/config';
import { defineVitestConfig } from './base';

const specsConfigs = defineVitestConfig({
	plugins: [swc.vite()],
	test: {
		include: [...configDefaults.include],
	},
});

export default specsConfigs;
