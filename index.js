/* Command line tools */
const print = console.log;
const inquirer = require('inquirer');
const CLI = require('clui');
const clear = require('clear');
const chalk = require('chalk');
const figlet = require('figlet');

// Observable state
let state = {
	initialized: false,
  io: {
  	connected: false,
  	reconnectionAttempt: false,
  },
  server: {
  	worldState: {
		  timeOfDay: 6500, // 0 - 24000
		  connections: 0,
		},
  },
  currentScreen: 'home',
  log: [],
};

const log = (m) => {
	state.log.push(m);
	if (state.log.length > 10) {
		state.log.shift();
	}
}

/* Socket.io */
const socketClient = require('socket.io-client')('http://localhost:5000/game', { autoConnect: false });

socketClient.on('connect', () => {
	state.io = {
		...state.io,
		id: socketClient.id,
		connected: true,
		reconnectionAttempt: false,
	};
});
socketClient.on('disconnect', () => {
	state.io = {
		...state.io,
		connected: false,
		reconnectionAttempt: false,
	};
});
socketClient.on('reconnect_attempt', () => {
	state.io.reconnectionAttempt = true;
});
socketClient.on('reconnect_error', () => {
	state.io = {
		...state.io,
		reconnectionAttempt: false,
	};
});

/* Custom events from server */
socketClient.on('WORLD_STATE', (worldState) => {
	state.server.worldState = {...worldState};
});

let t1 = Date.now();

const refreshRate = 75;
const render = () => {
	clear();

	const sideOutput = new CLI.LineBuffer({
	  x: 100,
	  y: 0,
	  width: 40,
	  height: 'console'
	});
	for (let i = 0; i < state.log.length; i++) {
		new CLI.Line(sideOutput)
	  .column(`${`${chalk.grey('$ ')}`} ${state.log[i]}`)
	  .store();
	}
	// Header
	print(chalk.rgb(3,108,165)(figlet.textSync('Grandquest-cli', { horizontalLayout: 'full' })));

  // Home Screen
	if (state.currentScreen === 'home')
	{
		print(`SOCKET ${state.io.connected ? `#${state.io.id}` : ''} \n -`);
		print(`Connected: ${chalk[state.io.connected ? 'green' : 'red'](state.io.connected ? 'Connected' : 'Not connected')}`);
		print(`Reconnection Status: ${chalk[state.io.reconnectionAttempt ? 'blue' : 'grey' ](state.io.reconnectionAttempt ? 'Attempting' : '...')} \n -`);
	} 
	// World State Screen
	else if (state.currentScreen === 'worldState')
	{
		print(`WORLD STATE \n -`);
		for (let i in state.server.worldState) {
			print(`${i} = ${state.server.worldState[i]}`)
		}
	}

	// bottom
	print(
	`
	${chalk.rgb(3,108,165)(`GQ-CLI time = ${Date.now()}`)}    ${chalk.red(`MS Lag = ${(Date.now() - t1)-refreshRate}`)}  ${chalk.yellow('Current screen = ' + state.currentScreen)}
	`);

	print('[x]: Exit,   [c]: Clear console,    [t]: Toggle Socket connection, [s]: Socket state,   [w]: World state,');

	sideOutput.output();
	t1 = Date.now();
}

// Readline lets us tap into the process events
const readline = require('readline');
// Allows us to listen for events from stdin
readline.emitKeypressEvents(process.stdin);

if (typeof process.stdin.setRawMode !== 'function') {
	console.warn('Could not setRawMode on process.stdin. Please make sure to run `node index.js` and not `nodemon`, as it uses child processes');
	process.exit();
}

// raw mode for inputs
process.stdin.setRawMode(true);

process.stdin.on('keypress', function (chunk, key) {
	// "Raw" mode so we must do our own kill switch
  if(key.sequence === '\u0003' || key.name === 'x') {
  	print(chalk.yellow('Goodbye!'));
    process.exit();
  }
  // Set the screen name
	if (!state.initialized || !key) {
		return;
	}

	if (key.name === 'w') {
  	state.currentScreen = 'worldState';
  } else if (key.name === 's') {
  	state.currentScreen = 'home';
  } else if (key.name === 't') {
  	if (state.io.connected || state.io.reconnectionAttempt) {
  		socketClient.close();
  		log('closed socket');
  	} else {
  		socketClient.open();
  		log('opened socket');
  	}
  } else if (key.name === 'c') {
  	state.log = [chalk.grey('cleared console')];
  }
});

clear();
socketClient.open();
state.initialized = true;
// loop this
setInterval(() => {
	render();
}, refreshRate);

