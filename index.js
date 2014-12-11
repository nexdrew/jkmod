'use strict';
var request = require('request');
var parser = require('xml2json');

var envMap = require('./jacket.json');

function querySingleApache(cfg) {
	cfg = cfg || {};
	request(cfg.jkUrl+'?cmd=list&mime=xml', function(error, response, body) {
		if(error || response.statusCode !== 200) {
			console.error('problem fetching balancer list', error);
			if(cfg.callback) cfg.callback(null, error, cfg.host, cfg.finalCallback);
			return;
		}

		// var norm = [], normB;
		var hosts = {};

		var json = parser.toJson(body, { object: true });
		var balancers = json['jk:status']['jk:balancers'];
		// console.log(JSON.stringify(balancers, null, '\t'));
		for(var prop in balancers) {
			if(prop === 'jk:balancer') {
				var balancersArray = balancers[prop], balancer;
				for(var i = 0; i < balancersArray.length; i++) {
					balancer = balancersArray[i];
					// normB = { name: balancer.name, members: [] };
					var memberArray = balancer['jk:member'];
					for(var j = 0; j < memberArray.length; j++) {
						var member = memberArray[j];
						// console.log(JSON.stringify(member, null, '\t'));

						// if(cfg.allMemberData) normB.members.push(member);
						// else normB.members.push({ name: member.name, host: member.host, activation: member.activation });

						if(!hosts[member.host]) hosts[member.host] = { status: 'unknown', apacheHosts: {} };
						if(member.activation === 'ACT' || hosts[member.host].status === 'ACT') hosts[member.host].status = 'ACT';
						else if(member.activation === 'DIS' || hosts[member.host].status === 'DIS') hosts[member.host].status = 'DIS';
						else hosts[member.host].status = member.activation;

						if(!hosts[member.host].apacheHosts[cfg.host]) hosts[member.host].apacheHosts[cfg.host] = [];
						hosts[member.host].apacheHosts[cfg.host].push({ balancer: balancer.name, name: member.name, activation: member.activation });
					}
					// norm.push(normB);
				}
			}
		}
		// console.log(norm);
		// if(cfg.callback) cfg.callback(norm, null);
		if(cfg.callback) cfg.callback(hosts, null, cfg.host, cfg.finalCallback);
	});
}

var numToCollect = 0, collected = 0;
var envData = {};
function collect(data, error, apacheHost, finalCallback) {
	// console.log('APACHE HOST ---------------\n'+JSON.stringify(data, null, '\t'));
	for(var jbossHost in data) {
		if(envData[jbossHost]) {
			//-- check status
			if(envData[jbossHost].status === 'ACT' || data[jbossHost].status === 'ACT') envData[jbossHost].status = 'ACT';
			else if(envData[jbossHost].status === 'DIS' || data[jbossHost].status === 'DIS') envData[jbossHost].status = 'DIS';
			else envData[jbossHost].status = data[jbossHost].status;

			//-- apacheHosts
			if(envData[jbossHost].apacheHosts[apacheHost]) {
				console.log('SHOULD NEVER HAPPEN?')
			} else {
				envData[jbossHost].apacheHosts[apacheHost] = data[jbossHost].apacheHosts[apacheHost]; //clunky!!!!
			}

			//-- append details
			// for(var d = 0; d < data[jbossHost].details.length; d++) {
			// 	envData[jbossHost].details.push(data[jbossHost].details[d]);
			// }
		} else {
			envData[jbossHost] = data[jbossHost];
		}
	}
	collected++;
	// if(last) console.log('TOTAL =================\n'+JSON.stringify(envData, null, '\t'));
	if(collected === numToCollect) {
		// console.log(JSON.stringify(envData, null, '\t'));
		finalCallback(envData);
	}
}

function queryAllApache(env, finalCallback) {
	var apacheHosts = envMap[env];
	numToCollect = apacheHosts.length;
	collected = 0;
	for(var i = 0; i < apacheHosts.length; i++) {
		console.log("querying "+apacheHosts[i].host);
		querySingleApache({ jkUrl: apacheHosts[i].jkUrl, host: apacheHosts[i].host, callback: collect, finalCallback: finalCallback });
	}
}

function prettyLog(data) {
	console.log(JSON.stringify(data, null, '\t'));
}

var actMap = { 'ACT': 0, 'DIS': 1, 'STP': 2 };

function editSingleApache(cfg) {
	var activation = actMap[cfg.status];
	request(cfg.jkUrl+'?cmd=update&from=list&w='+cfg.balancer+'&sw='+cfg.member+'&vwa='+activation, function(error, response, body) {
		if(error || response.statusCode !== 200) {
			console.error('problem updating activation '+JSON.stringify(cfg), error);
			if(cfg.callback) cfg.callback(false, error);
			return;
		}
		console.log('SUCCESS '+JSON.stringify(cfg));
		if(cfg.callback) cfg.callback(true, null);
	});
}

var updateJbossHost = null;
var toStatus = null;
var updateApacheHosts = null;

function handleQueryAndUpdate(data) {
	if(!updateJbossHost || !toStatus || !updateApacheHosts) {
		prettyLog(data);
		return;
	}
	for(var jbossHost in data) {
		if(jbossHost === updateJbossHost) {
			for(var apacheHost in data[jbossHost].apacheHosts) {
				for(var x = 0; x < updateApacheHosts.length; x++) {
					if(updateApacheHosts[x].host === apacheHost) {
						var barray = data[jbossHost].apacheHosts[apacheHost];
						for(var y = 0; y < barray.length; y++) {
							editSingleApache({ jkUrl: updateApacheHosts[x].jkUrl, balancer: barray[y].balancer, member: barray[y].name, status: toStatus, callback: null });
						}
					}
				}
			}
		}
	}
}

function edit(env, jbossHost, status) {
	updateJbossHost = jbossHost;
	toStatus = status;
	updateApacheHosts = envMap[env];
	queryAllApache(env, handleQueryAndUpdate);
}

function list(env) {
	queryAllApache(env, prettyLog);
}

exports.list = list;
exports.edit = edit;
