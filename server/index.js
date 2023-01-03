// Test Server
// Runs on port 8080

import express from 'express';
import { createServer } from 'http';
// @ts-ignore
import { Server } from 'socket.io';
import MultiplayerServer from './server.js';

const port = process.env.PORT || 8080;

const app = express();
const http = createServer(app);
const io = new Server(http, {
	cors: {
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST'],
		credentials: true,
	},
});

http.listen(port, () => {
	// eslint-disable-next-line no-console
	console.log(`listening on *:${port}`);
});

const testGame = new MultiplayerServer(io.of('/test'), 2);
