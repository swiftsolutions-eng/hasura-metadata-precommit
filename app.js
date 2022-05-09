const yaml = require("js-yaml");
const { exec } = require("child_process");
const minimatch = require("minimatch");
const fs = require("fs/promises");
const ora = require("ora");

const pattern = "**/hasura/**/*.yaml";

const YAML_CONFIG = {};

exec("git diff HEAD --name-only --diff-filter=ACM", async (error, stdout) => {
	const rawFiles = stdout?.split(/\n/g);
	const filteredFiles = rawFiles.filter(item => minimatch(item, pattern));
	const filesIter = filteredFiles[Symbol.iterator]();
	let isError = false;
	const walker = async () => {
		const file = filesIter.next();
		if (!file.value) {
			if (isError) {
				console.error("Please re-commit your changes.");
				process.exit(1);
			} else {
				process.exit(0);
			}
		}

		const spinner = ora(`Checking ${file.value}`).start();

		const rawStr = await fs.readFile(file.value, "utf8");
		const jsonDef = yaml.load(rawStr);
		const formattedYaml = yaml.dump(jsonDef, YAML_CONFIG);
		if (formattedYaml !== rawStr) {
			isError = true;
			spinner.stopAndPersist({
				symbol: "❌",
				text: `Invalid ${file.value}`,
			});
			await fs.writeFile(file.value, formattedYaml);
			exec(`git add ${file.value}`);
		} else {
			spinner.stopAndPersist({
				symbol: "✅",
				text: `Valid ${file.value}`,
			});
		}
		await walker();
	}
	await walker()
});
