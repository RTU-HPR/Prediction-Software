import { getSimulations } from './simulations.js';

export { getSessions, newSession, selectSession, selectedSession}

let sessions;
let selectedSession;

// Display the sessions in the dropdown
function displaySessions(data) {
  // Get the dropdown element
  let dropdown = document.getElementById('sessionDropdown');
  let dropdownList = document.getElementById('sessionDropdownList');
  // Clear the dropdown
  dropdownList.innerHTML = '';
  // Unhide the dropdown
  dropdown.hidden = false;
  // For each session, create an ulist item and add it to the dropdown
  data.data.forEach(session => {
    let listItem = document.createElement('ul');
    listItem.innerHTML = `<a href="#">${session.session_name}</a>`;
    listItem.addEventListener("click", function(){ selectSession(session.id) })
    dropdownList.appendChild(listItem);
  });
}

// Get the sessions from the server
function getSessions() {
  fetch('/get_sessions')
  .then(response => response.json())
  .then(data => {
    if (data.status === 'error') {
      console.error('Error getting sessions:', data.error);
      return;
    }
    else {
      // Save the sessions to a global variable
      sessions = data.data;
      // Display the sessions in the table
      displaySessions(data);
    }
  });
}

function newSession() {
  // Create a prompt for the user to enter a session name
  let sessionName = prompt('Enter a name for the new session:');
  if (sessionName == null || sessionName == "") {
    return;
  }
  // Create a prompt for the user to enter a session description
  let sessionDescription = prompt('Enter a description for the new session:');
  if (sessionDescription == null) {
    return;
  }
  // Send the new session name and description to the server
  fetch('/new_session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({session_name: sessionName, session_description: sessionDescription})
  })
}

// When a session is selected from the dropdown, update the map with the session's coordinates
function selectSession(id) {
  // Find the selected session from the global sessions array
  for (let i = 0; i < sessions.length; i++) {
    if (sessions[i].id == id) {
      selectedSession = sessions[i];
      break;
    }
  }
  // Update the session info
  document.getElementById('sessionInfo').hidden = false;
  document.getElementById('sessionID').innerText = selectedSession.id;
  document.getElementById('sessionName').innerText = selectedSession.session_name;
  if (selectedSession.description == "") {
    document.getElementById('sessionDescription').innerText = 'No description';
  }
  else
  {
    document.getElementById('sessionDescription').innerText = selectedSession.session_description;
  }

  // Enable simulation form
  document.getElementById('simulationContainer').hidden = false;

  // Check for existing simulations
  getSimulations();
}