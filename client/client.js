import Socket from './socket.js';

/**
 *
 * @param {string} url URL of server
 * @param {string|null} gameID Game ID if client, null if host
 * @param {string} playerName Name of player
 * @param {(error: string) => void} showError Callback to display error
 * @param {(start: undefined | (() => void)) => void} connectionSuccess
 * Callback when the initial server connection was made successfully
 * @param {(id: number, name: string) => void} playerJoin
 * Callback when player joins. Used for updating UI during connection.
 * Can also be called during the game for reconnections.
 * @param {(id: number) => void} playerLeave
 * Callback when player leaves. Used for updating UI during connection.
 * Can also be called during the game for disconnections.
 * @param {(socket: Socket, names: string[], playerID: number) => void} ready
 * Callback to start the game
 */
export default async function setupGame(
	url,
	gameID,
	playerName,
	showError,
	connectionSuccess,
	playerJoin,
	playerLeave,
	ready,
) {
	const socket = new Socket(url);

	let roomID = gameID;
	let playerID = 0;

	if (gameID === null) {
		try {
			roomID = await connectAsHost(socket, playerName);
			connectionSuccess(() => socket.emit('conn_allJoined', ''));
		} catch (errorReason) {
			showError(/** @type {string} */(errorReason));
			return;
		}
	} else {
		try {
			const result = await connectAsClient(socket, gameID, playerName);
			playerID = result.playerID;
			connectionSuccess(undefined);
			result.names.forEach((n, pid) => {
				playerJoin(pid, n);
			});
		} catch (errorReason) {
			showError(/** @type {string} */(errorReason));
			return;
		}
	}

	socket.on('conn_joinNew', (raw) => {
		const { pID, name } = JSON.parse(raw);
		playerJoin(pID, name);
	});
	socket.on('conn_ready', (raw) => {
		const { names } = JSON.parse(raw);
		ready(socket, names, playerID);
	});
}

/**
 * @param {Socket} socket
 * @param {string} name
 * @returns {Promise<string>} Promise resolving to room ID, or rejecting with string reason.
 */
function connectAsHost(socket, name) {
	const cleanupListeners = () => {
		socket.off('conn_createYes');
		socket.off('conn_createNo');
	};
	return new Promise((resolve, reject) => {
		socket.on('conn_createYes', (raw) => {
			const { id } = JSON.parse(raw);
			cleanupListeners();
			resolve(id);
		});
		socket.on('conn_createNo', (raw) => {
			const { reason } = JSON.parse(raw);
			cleanupListeners();
			reject(reason);
		});
		socket.send('conn_create', { name });
	});
}

/**
 * @param {Socket} socket
 * @param {string} roomID
 * @param {string} playerName
 * @returns {Promise<{playerID: number, names: string[]}>}
 * Promise resolving to player ID, or rejecting with string reason.
 */
function connectAsClient(socket, roomID, playerName) {
	const cleanupListeners = () => {
		socket.off('conn_joinYes');
		socket.off('conn_joinNo');
	};
	return new Promise((resolve, reject) => {
		socket.on('conn_joinYes', (raw) => {
			const { playerID, players } = JSON.parse(raw);
			/** @type {string[]} */
			const names = [];
			players.forEach(
				/**
				 * @param {string} name
				 * @param {number} id
				 */
				(name, id) => { names[id] = name; },
			);
			cleanupListeners();
			resolve({ playerID, names });
		});
		socket.on('conn_joinNo', (raw) => {
			const { reason } = JSON.parse(raw);
			cleanupListeners();
			reject(reason);
		});
		socket.send('conn_join', { id: roomID, name: playerName });
	});
}
