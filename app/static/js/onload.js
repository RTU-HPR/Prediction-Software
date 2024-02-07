import { createMap } from './map.js';
import { getSessions, newSession } from './sessions.js';
import { requestSimulation } from './simulations.js';

// Before page is shown
document.addEventListener('DOMContentLoaded', (event) => {  
  document.getElementById('newSession').onclick = function(){newSession()};
  document.getElementById('startSimulation').onclick = function(){requestSimulation()};

  // Create a Leaflet map
  createMap();

  // Get the sessions from the server
  getSessions();
});