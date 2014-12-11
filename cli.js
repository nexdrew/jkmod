#!/usr/bin/env node
'use strict';

var commander = require('commander');
var pkg = require('./package.json');
var jacket = require('./');

commander.version(pkg.version);

// console.log(jacket);
var good = false;

commander
	.command('list <env>')
	.description('List status of all configured JBoss workers in all Apache hosts for the given environment')
	.action(function list(env) {
		good = true;
		jacket.list(env);
	});

commander
	.command('edit <env> <jbossHost> <status>')
	.description('Set given JBoss worker to given status in all Apache hosts for the given environment')
	.action(function edit(env, jbossHost, status) {
		good = true;
		jacket.edit(env, jbossHost, status);
	});

commander.parse(process.argv);

if(!good) commander.help();