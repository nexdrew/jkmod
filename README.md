# ʇǝʞɔɐՐ

CLI for Apache mod_jk status worker (because antiquated tech is cool!)

## The Story

Boss (at 3pm): "Hey, we're gonna need a script to take JBoss nodes out of our Apache load balancer pools for our next rolling deployment."

me: "Cool, I'll write something up. When's the deployment scheduled?"

Boss: "In 3 hours."

me: "... Ok ..."

So before you go any further, here are some of the caveats of a module built by me in a couple of hours:

- This is a hack. Use at your own risk.
- Apparently, it doesn't work on Windows [without additional effort](http://node-xmpp.github.io/doc/nodeexpat.html#toc_6).
- The code is really hairy.
- The console output is mostly JSON.
- It doesn't work without configuration.
- It doesn't handle errors well (or at all, really).
- It provides a very small subset of functionality based on the "jkstatus" or "jkmanager" web interface.

But, if you're in a pinch, it *is* functional and *can* get the job done.

Also, like most good hacks, it will probably become heavily used and relied on (at least at my job) for years to come.

## Install

On Unix:

```sh
$ npm install -g jacket
```

On Windows:

1. Install [MTPuTTY](http://ttyplus.com/multi-tabbed-putty/).
2. SSH into a Unix box.
3. See Unix install above.

## Configuration

Currently requires a `jacket.json` file to be defined in the current working directory. The structure of the JSON config is:

```json
{
	"your-environment-name-here": [
		{ "host": "apache-host-1", "jkUrl": "http://apache-host-1/jkstatus/" },
		{ "host": "apache-host-2", "jkUrl": "http://apache-host-1/jkstatus/" }
	],
	"another-environment-name-here": [
		{ "host": "apache-host-3", "jkUrl": "http://apache-host-3.yourdomain.com/jkstatus/" },
		{ "host": "apache-host-4", "jkUrl": "http://apache-host-4.yourdomain.com/jkstatus/" }
	]
}
```

The environment names will be used on the command line, so make them short, meaningful, and command-line-friendly. The `jkUrl` values are the most important, and they should work in your browser (without any authentication, for now). Note that the trailing slash may be important, depending on your Apache config.

Here's an example:

```json
{
	"dev": [
		{ "host": "friendlydev1", "jkUrl": "http://friendlydev1.intra.net:81/jkstatus/" },
		{ "host": "cuddlydev2", "jkUrl": "http://cuddlydev2.intra.net:81/jkstatus/" }
	],
	"prd": [
		{ "host": "scaryprd1", "jkUrl": "http://scaryprd1.jacket.com/jkstatus/" },
		{ "host": "meanprd2", "jkUrl": "http://meanprd2.jacket.com/jkstatus/" },
		{ "host": "willhurtyouprd3", "jkUrl": "http://willhurtyouprd3.jacket.com/jkstatus/" },
		{ "host": "dontmessthisupprd4", "jkUrl": "http://dontmessthisupprd4.jacket.com/jkstatus/" }
	]
}
```

## Usage

Query a set of hosts defined for the given environment and output the status of each configured Tomcat node/worker.
The `<env>` value you specify must be defined in your `jacket.json` file in the current working directory.

```sh
$ jacket list <env>
```

Update the activation status for given Tomcat node/worker in the given environment.
The `<env>` value you specify must be defined in your `jacket.json` file in the current working directory.
The `<tomcatHost>` value should come from the output of `jacket list <env>`.
The `<status>` value should be one of:
- `ACT` for *active* (the node/worker will receive traffic from the Apache load balancer pool)
- `DIS` for *disabled* (the node/worker will only receive sticky traffic from existing sessions - meant to bleed traffic off of this worker)
- `STP` for *stopped* (the node/worker will stop receiving any traffic)

```sh
$ jacket edit <env> <tomcatHost> <status>
```

For questions about the load balancer member status, see the [mod_jk documentation](http://tomcat.apache.org/connectors-doc/generic_howto/loadbalancers.html#Advanced Load Balancer Worker Properties).

## Everything else

If you need more functionality, consider using [the jk status worker Ant tasks](http://tomcat.apache.org/connectors-doc/miscellaneous/jkstatustasks.html) instead.

Or just upgrade to mod_cluster. 😉