#!/usr/bin/env node

import fs from 'fs';
import os, {version} from 'os';
import path from 'path';
import tar from 'tar';
import {program} from 'commander';
import prompts from 'prompts';
import {Octokit} from 'octokit';
import chalk from 'chalk';

if (process.platform == 'win32') {
	console.log('Windows is not supported. Please use WSL');
	process.exit(1);
}

let bashrc = path.join(os.homedir(), '.bashrc');
let cacheDir = path.join(os.homedir(), '.cache/mocv');
let curVersionFile = path.join(cacheDir, 'versions/current/version.txt');
let file = '.tmp/moc.tar.gz';

let download = async (version, {silent} = {}) => {
	if (!version) {
		console.log('version is not defined');
		process.exit(1);
	}
	if (isCached(version)) {
		return;
	}

	silent || console.log('Downloading...');
	let platfrom = process.platform == 'darwin' ? 'macos' : 'linux64';
	let url = `https://github.com/dfinity/motoko/releases/download/${version}/motoko-${platfrom}-${version}.tar.gz`;
	let res = await fetch(url);

	if (res.status !== 200) {
		console.log(`ERR ${res.status} ${url}`);
		console.log(`moc version '${version}' not found`);
		process.exit(1);
	}

	let arrayBuffer = await res.arrayBuffer();
	let buffer = Buffer.from(arrayBuffer);

	fs.mkdirSync('.tmp', {recursive: true});
	fs.writeFileSync(file, buffer);

	let verDir = path.join(cacheDir, 'versions', version);
	fs.mkdirSync(verDir, {recursive: true});
	await tar.extract({
		file,
		cwd: verDir,
	});

	fs.rmSync(file);
}

let isCached = (version) => {
	let dir = path.join(cacheDir, 'versions', version);
	return fs.existsSync(path.join(dir, 'moc'))
		&& fs.existsSync(path.join(dir, 'mo-doc'))
		&& fs.existsSync(path.join(dir, 'mo-ide'));
}

let setCurrent = (version) => {
	fs.cpSync(path.join(cacheDir, 'versions', version), path.join(cacheDir, 'versions/current'), {recursive: true});
	fs.writeFileSync(curVersionFile, version);
}

let getCurrent = () => {
	if (fs.existsSync(curVersionFile)) {
		return fs.readFileSync(curVersionFile).toString();
	}
}

let getLatest = async () => {
	let releases = await getReleases();
	return releases[0].tag_name;
}

let getReleases = async () => {
	let octokit = new Octokit;
	let res = await octokit.request('GET /repos/dfinity/motoko/releases', {
		per_page: 10,
		headers: {
			'X-GitHub-Api-Version': '2022-11-28'
		}
	});
	if (res.status !== 200) {
		console.log('Releases fetch error');
		process.exit(1);
	}
	return res.data;
}

let use = async (version) => {
	if (version === 'latest') {
		version = await getLatest();
	}
	await download(version);
	setCurrent(version);
	console.log(`Selected moc ${version}`);
}

program.name('mocv')
	.action(async (_, config) => {
		if (config.args.length) {
			console.log(`unknown command '${config.args.join(' ')}'`);
			process.exit(1);
		}
		let releases = await getReleases();
		let versions = releases.map(item => item.tag_name);
		let current = getCurrent();
		let currentIndex = versions.indexOf(current);

		let res = await prompts({
			type: 'select',
			name: 'version',
			message: 'Select moc version',
			choices: releases.map((release, i) => {
				let date = new Date(release.published_at).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});
				return {
					title: release.tag_name + chalk.gray(`  ${date}${currentIndex === i ? chalk.italic(' (current)') : ''}`),
					value: release.tag_name,
				};
			}),
			initial: currentIndex == -1 ? 0 : currentIndex,
		});

		if (!res.version) {
			return;
		}

		await use(res.version);
	});

let updateBashrc = ({reset = false} = {}) => {
	if (!fs.existsSync(bashrc)) {
		console.log(`${bashrc} not found`);
		process.exit(1);
	}

	let data = fs.readFileSync(bashrc).toString();
	let appendLine = `\nexport DFX_MOC_PATH=${path.join(cacheDir, 'versions/current')}/moc\n`;
	let appendLineOld = appendLine;
	data = data.replace(appendLineOld, '');

	if (!reset) {
		data += appendLine;
	}

	fs.writeFileSync(bashrc, data);

	console.log('Success!');
	// console.log(`Run "source ${bashrc}" to apply changes`);
	console.log(`Restart terminal to apply changes`);
}

program.command('init')
	.description(`Add to ${bashrc} line to set DFX_MOC_PATH to point to the current moc version`)
	.action(async (options) => {
		updateBashrc();
	});

program.command('reset')
	.description(`Reset env file`)
	.action(async (options) => {
		updateBashrc({reset: true});
	});

program.command('use <version>')
	.description('Set current moc version.\nExample 1: "mocv use 0.8.4"\nExample 2: "mocv use latest"')
	.action(async (version) => {
		await use(version);
	});

program.command('current')
	.description('Print current moc version')
	.action(async (version) => {
		console.log(getCurrent());
	});

program.command('bin [version]')
	.description('Print bin directory')
	.action(async (version = getCurrent()) => {
		if (!version) {
			console.log('No version selected. Please pass a version arg or run `mocv` or `mocv use <version>`');
			process.exit(1);
		}
		if (!isCached(version)) {
			await download(version, {silent: true});
		}
		console.log(path.join(cacheDir, 'versions', version));
	});

program.parse();