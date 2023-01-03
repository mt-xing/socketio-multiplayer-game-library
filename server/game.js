import * as io from '../node_modules/socket.io/dist/index.js';

export default class MultiplayerGame {
	/** @type {string[]} */
	#names;

	/** @type {io.Socket[]} */
	#sockets;

	/** @type {boolean} */
	#acceptingPlayers;

	/** @type {number} */
	#max;

	/**
	 * Create a helper to setup a new game
	 * @param {string} hostPlayerName
	 * @param {io.Socket} hostPlayerSocket
	 * @param {number} maxPlayers
	 */
	constructor(hostPlayerName, hostPlayerSocket, maxPlayers) {
		this.#names = [hostPlayerName];
		this.#acceptingPlayers = true;
		this.#sockets = [hostPlayerSocket];
		this.#max = maxPlayers;
	}

	/**
	 * Add a player to the game
	 * @param {string} name
	 * @param {io.Socket} socket
	 * @returns {number|'full'|'duplicate'|'done'} Whether joining was successful or not
	 */
	addPlayer(socket, name) {
		if (!this.#acceptingPlayers) {
			return 'done';
		}
		if (this.#names.length >= this.#max) {
			return 'full';
		}
		if (this.#names.some((x) => x === name)) {
			return 'duplicate';
		}
		this.#names.push(name);
		this.#sockets.push(socket);
		return this.#names.length - 1;
	}

	get players() {
		return this.#names;
	}

	get sockets() {
		return this.#sockets;
	}

	finishSetup() {
		this.#acceptingPlayers = false;
	}
}
