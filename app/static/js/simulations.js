import { addSimulationLayer } from './map.js';
import { selectedSession } from './sessions.js';
export { requestSimulation, getSimulations };


// Request a new simulation from the server
function requestSimulation(){
  if (document.getElementById('simulationName').value == "" || document.getElementById('startDate').value == "" || document.getElementById('latitude').value == "" || document.getElementById('longitude').value == "" || document.getElementById('launchAltitude').value == "" || document.getElementById('burstAltitude') == "" || document.getElementById('ascentSpeed').value == "" || document.getElementById('descentSpeed').value == "") {
    alert('Please fill in all the fields for simulation');
    return;
  }

  document.getElementById('startSimulation').disabled = true;
  setTimeout(function() {
    document.getElementById('startSimulation').disabled = false;
  }, 20000);
  
  let simulationName = document.getElementById('simulationName').value
  let startDate = document.getElementById('startDate').value
  let latitude = document.getElementById('latitude').value
  let longitude = document.getElementById('longitude').value
  let launchAltitude = document.getElementById('launchAltitude').value
  let burstAltitude = document.getElementById('burstAltitude').value
  let ascentSpeed = document.getElementById('ascentSpeed').value
  let descentSpeed = document.getElementById('descentSpeed').value

  // Send the new simulation data to the server with a GET request and query parameters
  fetch(`/run_sondehub_simulation?session_id=${selectedSession.id}&simulationName=${simulationName}&startDate=${startDate}&latitude=${latitude}&longitude=${longitude}&launchAltitude=${launchAltitude}&burstAltitude=${burstAltitude}&ascentSpeed=${ascentSpeed}&descentSpeed=${descentSpeed}`)
  .then(response => response.json())
  .then(data => {
    if (data.status === 'error') {
      console.error('Error starting simulation:', data.message);
      return;
    }
  });
}


// Get all simulations from the server with the current session id
function getSimulations(){
  fetch(`/get_simulations?session_id=${selectedSession.id}`)
  .then(response => response.json())
  .then(data => {
    if (data.status === 'error') {
      console.error('Error getting simulations:', data.message);
      return;
    }
    else {
      // Add the simulations to the leaflet map as a overlay
      for (let i = 0; i < data.data.length; i++) {
        addSimulationLayer(data.data[i]);
      }
    }
  });
}
