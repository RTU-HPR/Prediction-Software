export { createMap, clearMap, addSimulationLayer };

let map;
let layerControl;
let overlayMaps = {};

var customDotIcon = L.icon({
  iconUrl: '/static/icons/dot.png',
  iconSize: [5, 5]
  });
  
// Add the simulations to the leaflet map as a overlay with markers with the coordinates and altitude displayed when clicked on the marker 
function addSimulationLayer(simulation){
  // Check if the simulation is already added to the map
  if (overlayMaps[simulation.name] != undefined) {
    return;
  }
  
  let layerItems = [];
  layerItems.push(L.polyline(simulation.prediction.coordinates, {color: 'red'}));

  // Add clickable points with coordinates and altitude displayed on each coordinate
  for (let i = 0; i < simulation.prediction.coordinates.length; i++) {
    let coordinate = simulation.prediction.coordinates[i];
    let marker = L.marker(coordinate, {icon: customDotIcon}).bindPopup(`Latitude: ${coordinate[0]}<br>Longitude: ${coordinate[1]}<br>Altitude: ${coordinate[2]}`);
    layerItems.push(marker);
  }
  let simulationLayer = L.layerGroup(layerItems);
  overlayMaps[simulation.name] = simulationLayer;
  layerControl.addOverlay(simulationLayer, simulation.name);
}

// Create a Leaflet map
function createMap() {
  map = L.map('map').setView([56.952511, 24.081188], 13);

  layerControl = L.control.layers(null, overlayMaps).addTo(map);

  // Get current GPS location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        // Set map view to current GPS location
        map.setView([position.coords.latitude, position.coords.longitude], 13);
      },
      function(error) {
        console.error('Error getting current location:', error);
      }
    );
  } else {
    console.error('Geolocation is not supported by this browser.');
  }

  // Add a tile layer to the map
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);
}


// Clear the map of all markers and lines
function clearMap() {
  map.eachLayer(function(layer){
    for (var i in markerArray) {
      map.removeLayer(markerArray[i]);
    }
    for(i in map._layers) {
      if(map._layers[i]._path != undefined) {
        try {
          map.removeLayer(map._layers[i]);
        }
        catch(e) {
          console.log("problem with " + e + map._layers[i]);
        }
      }
    }
  });
}
