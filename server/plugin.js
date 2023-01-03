import * as io from '../node_modules/socket.io/dist/index.js';

export default class MultiplayerGamePlugin {
	constructor() {
		if (this.constructor === MultiplayerGamePlugin) {
			throw new Error('Cannot instantiate abstract class');
		}
	}

	/**
	 *
	 * @param {string[]} names
	 * @param {io.Socket[]} sockets
	 */
	setupComplete(names, sockets) {
		throw new Error('setupComplete() must be implemented');
	}
}
