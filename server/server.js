import * as io from '../node_modules/socket.io/dist/index.js';
import MultiplayerGame from './game.js';

export default class MultiplayerServer {
	/**
	 * @type {io.Namespace}
	 */
	#namespace;

	/**
	 * @type {number}
	 */
	#maxPlayers;

	/**
	 * @type {Map<number, string>} Socket ID to room ID
	 */
	#socketRoom;

	/**
	 * @type {Map<string, MultiplayerGame>}
	 */
	#games;

	/**
	 * Create a new server
	 * @param {io.Namespace} namespace A socket.io namespace for the game to operate on
	 * @param {number} maxPlayers Maximum number of players per game
	 */
	constructor(namespace, maxPlayers) {
		this.#namespace = namespace;
		this.#maxPlayers = maxPlayers;
		this.#socketRoom = new Map();
		this.#games = new Map();

		namespace.on('connection', (socket) => {
			socket.on('conn_create', this.#createRoom.bind(this, socket));
			socket.on('conn_join', this.#joinRoom.bind(this, socket));
			socket.on('conn_allJoined', this.#setupDone.bind(this, socket));
			socket.on('conn_disconnect', () => {});
		});
	}

	/**
	 * Attempt to create a new room
	 * @param {io.Socket} socket
	 * @param {string} roomInfo
	 */
	#createRoom(socket, roomInfo) {
		const getID = () => Math.random().toString(36).substring(2, 7);
		let remainingTries = 50;
		while (remainingTries > 0) {
			const id = getID();
			if (!this.#games.has(id)) {
				socket.join(id);
				/** @type {{name: string}} */
				const { name } = JSON.parse(roomInfo);
				this.#games.set(id, new MultiplayerGame(name, socket, this.#maxPlayers));
				this.#socketRoom.set(socket.id, id);

				socket.emit('conn_createYes', JSON.stringify({ id }));

				return;
			}
			remainingTries--;
		}
		socket.emit('conn_createNo', JSON.stringify({ reason: 'Unable to assign a room ID. The server may be suffering from congestion at the moment. Please try again later.' }));
	}

	/**
	 * Join an existing room being setup
	 * @param {io.Socket} socket
	 * @param {string} roomInfo
	 */
	#joinRoom(socket, roomInfo) {
		/** @type {{id: string, name: string}} */
		const { id, name } = JSON.parse(roomInfo);
		const game = this.#games.get(id);
		if (game === undefined) {
			socket.emit('conn_joinNo', JSON.stringify({ reason: 'This game code does not exist' }));
			return;
		}
		const addResult = game.addPlayer(socket, name);
		switch (addResult) {
		case 'full':
			socket.emit('conn_joinNo', JSON.stringify({ reason: 'This game is full' }));
			break;
		case 'done':
			socket.emit('conn_joinNo', JSON.stringify({ reason: 'This game is no longer accepting more players' }));
			break;
		case 'duplicate':
			socket.emit('conn_joinNo', JSON.stringify({ reason: 'Someone else already has that name' }));
			break;
		default:
			socket.emit('conn_joinYes', JSON.stringify({ playerID: addResult, players: game.players }));
			this.#namespace.to(id).emit('conn_joinNew', JSON.stringify({ playerID: addResult, name }));
			socket.join(id);
			this.#socketRoom.set(socket.id, id);
			break;
		}
	}

	/**
	 * @param {io.Socket} socket
	 */
	#setupDone(socket) {
		const room = this.#socketRoom.get(socket.id);
		const game = this.#games.get(room ?? '');
		if (game === undefined || room === undefined) {
			return;
		}

		game.finishSetup();
	}
}
