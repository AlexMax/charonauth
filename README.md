Charonauth
==========

A game authentication server with a built-in web interface.

Installation
------------

This application is:

1. Not finished.  The software has seen use in the wild for many months now and I have heard nothing but good things about its stability, however I cannot give you any guarantees of stability, in terms of the software or the database schema.
2. Not really designed to be easy for end users to run on their own.  It's aimed at server administrators who can do the legwork of deploying it.
3. Already hosted in several places.  You do not need to run your own authentication server to make use of auth server features in Zandronum, simply set the `authhostname` variable of to `best-ever.org` (hosted by Jenova), `grandvoid.sickedwick.net` (hosted by Konar6), or `auth.funcrusher.net` (hosted by myself).

That said, if you're serious about toying around with it locally, here's how you do it.  Note that installing this on Windows is a gigantic headache and should not be used for production systems - I only support it because I like working on my desktop PC with Windows installed.

You need to install:

* Git.  You must have this installed, even if you download this repository as a .ZIP file.
* A recent version of Node.js. You want a version of node.js that's 0.10.something.  If you're on debian, backports has it. If you're on CentOS, EPEL has it.
* npm.  I think that most every modern version of Node.js comes with this already, but just so we're clear, you do need this.
* Python 2.7.
* A C++ compiler, either gcc on linux, clang on OSX or Visual C++ Express for Desktop on Windows.
* OpenSSL development packages.  If you're on linux, install openssl-dev or whatever it's called. If you're on OSX, install a recent OpenSSL via homebrew.  If you're on Windows, you need one of [these](https://slproweb.com/products/Win32OpenSSL.html) packages.  Get the non-lite version, and get the version that is the same architecture (32/64) as your Node.js installation.  If you try and install it and it gives you a warning about missing a Visual C++ redistributable, heed the warning and download the Visual C++ 2008 redistributable for the same architecture (32/64).  See, I told you that installing on Windows was a gigantic headache.

Once you have everything installed, this is how you install the login server itself.

1. `git clone` the repository into an empty directory.
2. Open a command prompt in the charonauth directory and `npm install` the dependencies.
3. Next, `npm install sqlite3`.  I haven't tested charonauth with other databases, and since you're only testing it locally it should be more than adequate.
4. Copy the `charonauth-default.ini` file to `charonauth.ini` and fill it out.
5. Run `npm test` at the command prompt.  All of the tests should pass.
6. Finally, at the command prompt, `./bin/charonauth` on Linux/OSX or `node .\bin\charonauth` on Windows.

If all goes well, the server should be up and running. You should see something like:

    PS C:\Users\Alex\Workspace\charonauth> node .\bin\charonauth
    info: Starting up...
    info: Forking 1 web worker processes.
    warn: Authentication forced to single process due to nodejs limitation.
    info: Authentication worker 6340 starting...
    info: Web worker 6212 starting...
    info: Authentication worker 6340 started.
    info: Web worker 6212 started.

The warning only appears on Windows and it simply says that the authentication subprocess must run by itself, without splitting work among multiple workers.

Open a web browser and go to <http://localhost:your_web_port> and you should see a web interface.  Some of the links don't work, but __Register__ and __Login__ should, so you can add a test account.

All you have to do now is configure the Zandronum server to point at your login server.  The cvar should be `authhostname` and should take an _ip:port_ representation.

License
-------

This software has been released under the [GNU Affero General Public License](https://www.gnu.org/licenses/agpl-3.0.html).  It seemed prudent to start with a license that ensures code freedom, because once you switch to a license that prioritizes developer freedom it's very hard to put the genie back in the bottle.  If you have a particular use case in mind where the AGPL would be problematic, however, I am open to alternative licensing arrangements.

I have also vendored Mozilla's [node-srp](https://github.com/mozilla/node-srp) library and have added a few fixes for the final client verification message, and I feel like the only fair thing to do is to continue to offer this modified library under its original [MIT license](http://opensource.org/licenses/MIT).
