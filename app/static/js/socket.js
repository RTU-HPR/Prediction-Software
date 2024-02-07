import { getSessions } from './sessions.js';
import { getSimulations } from './simulations.js';

// Initialize a socket connection
let socket = io();

socket.on('new_session', () => {
  getSessions();
});

socket.on('new_simulation', () => {
  getSimulations();
});