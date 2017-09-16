/* jshint esversion: 6 */

// *viewmodel* - JavaScript that defines the data and behavior of your UI
function AppViewModel() {
  let self = this;

  self.zoomToAreaText = ko.observable('');
  self.placesSearchboxText = ko.observable('');
  self.crimeSeverity = ko.observable('');
  self.mapType = ko.observable('');

  // loop through and display all crime markers
  self.showCrimes = function(fitBounds = true) {
    // instantiate map boundaries
    let bounds = new google.maps.LatLngBounds();

    for (let i = 0; i < crimeMarkers.length; i++) {
      crimeMarkers[i].setMap(map);
      // extend map boundaries for each marker
      bounds.extend(crimeMarkers[i].position);
    }
    // update map to new boundaries
    if (fitBounds) {
      map.fitBounds(bounds);
    }
  }

  // disable layers, hide crimeMarkers, hide placeMarkers
  self.resetMarkers = function() {
    hideMarkers(placeMarkers);
    hideMarkers(crimeMarkers);
    if (markerCluster) {
      markerCluster.clearMarkers();
    }
    heatmap.setMap(null);
  }

  // hides arrays of markers
  self.hideMarkers = function(markers) {
    for (let i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
  }

  // populate array of markers when executing a search for nearby places
  self.createMarkersForPlaces = function(places) {
    let bounds = new google.maps.LatLngBounds();

    for (let i = 0; i < places.length; i++) {
      let place = places[i];
      let icon = {
        url: place.icon,
        size: new google.maps.Size(35, 35),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(15, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      let marker = new google.maps.Marker({
        map: map,
        icon: icon,
        title: place.name,
        position: place.geometry.location,
        id: place.place_id
      });
      placeMarkers.push(marker);

      // add listeners to open infowindow with place details on click
      marker.addListener('click', setupPlaceMarkerListener);

      if (place.geometry.viewport) {
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    }
    // map.fitBounds(bounds);
  }

  // shows and hides drawing options
  self.toggleDrawingManager = function(drawingManger) {
    if (drawingManager.map) {
      drawingManager.setMap(null);
      if (polygon) {
        // removes polygon but leaves markers
        polygon.setMap(null);
      }
    } else {
      drawingManager.setMap(map);
    }
  }

  // update map view based on user input for a specific address, area, or place
  self.zoomToArea = function() {
    let geocoder = new google.maps.Geocoder();
    let address = self.zoomToAreaText();

    // prompt if input box is empty
    if (address === '') {
      window.alert('Please enter an area, place, or address');
    } else {

      // geocode it to get lat lng
      geocoder.geocode({
        address: address
      }, function(results, status) {
        if (status == 'OK') {
          // if response is successful, update map center and zoom in
          map.setCenter(results[0].geometry.location);
          map.setZoom(14);
        } else {
          window.alert('There was an error connecting to the server. Please try again');
        }
      });
    }
  }

  // executes if user enters text to search places and clicks 'go'
  self.searchNearbyPlaces = function() {
    let bounds = map.getBounds();
    let placesService = new google.maps.places.PlacesService(map);
    let searchText = self.placesSearchboxText();

    self.hideMarkers(placeMarkers);

    if (searchText === '') {
      window.alert('Please enter an area or place');
    } else {
      placesService.textSearch({
        // bias the search to be within 1000m of the center of the map
        location: map.getCenter(),
        radius: 2000,
        query: searchText,
        bounds: bounds
      }, function(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          self.createMarkersForPlaces(results);
        }
      });
    }
  }

}

// instantiate autocomplete and update value for the binding when a user
// selects an autocomplete suggestion
ko.bindingHandlers.addressAutocomplete = {
  // This will be called when the binding is first applied to an element
  // Set up any initial state, event handlers, etc. here
  init: function(element, valueAccessor, allBindingsAccessor) {
    let value = valueAccessor();

    let zoomAutocomplete = new google.maps.places.Autocomplete(element);
    zoomAutocomplete.bindTo('bounds', map);

    // adds listener to update value on place_changed event, after user selects
    // from autocomplete dropdown
    google.maps.event.addListener(zoomAutocomplete, 'place_changed', function() {
      let result = zoomAutocomplete.getPlace();
      value(result.formatted_address);
    });
  },

  // This will be called once when the binding is first applied to an element,
  // and again whenever any observables/computeds that are accessed change
  // Update the DOM element based on the supplied values here.
  update: function(element, valueAccessor, allBindingsAccessor) {
    ko.bindingHandlers.value.update(element, valueAccessor);
  }
};

// search box, more wide-reaching version of autocomplete. able to search places
ko.bindingHandlers.placesSearchbox = {
  init: function(element, valueAccessor, allBindingsAccessor) {
    let value = valueAccessor();
    let searchBox = new google.maps.places.SearchBox(element);

    // executes if user enters text to search places and clicks a suggestion
    searchBox.addListener('places_changed', function() {
      self.hideMarkers(placeMarkers);

      // bias the SearchBox results towards current map's viewport.
      searchBox.setBounds(map.getBounds());

      let places = searchBox.getPlaces();
      self.createMarkersForPlaces(places);

      if (places.length === 0) {
        window.alert('We did not find any places matching that request');
      }
      value(element.value);
    });

    // add listener to update value when blurring off the input, to allow
    // searching without clicking a searchBox suggestions
    element.addEventListener('blur', function() {
      value(element.value);
    });

    // updates searchBox bounds anytime the map bounds change
    google.maps.event.addListener(map, 'bounds_changed', function() {
      searchBox.setBounds(map.getBounds());
    });
  },

  update: function(element, valueAccessor, allBindingsAccessor) {
    ko.bindingHandlers.value.update(element, valueAccessor);
  }
};

// Activates knockout.js
// ko.applyBindings(new AppViewModel());

$(document).ready(function() {
  $('select').material_select();

  // toggles different views of crime data
  document.getElementById('toggleStandard').addEventListener('click', toggleStandard);
  document.getElementById('toggleCluster').addEventListener('click', toggleCluster);
  document.getElementById('toggleHeatmap').addEventListener('click', toggleHeatmap);

  // listen for users to click for filtering by category
  // and grab the selected category from the dropdown
  document.getElementById('crimeType-go').addEventListener('click', function(e) {
    filterCrimeMarkersType(document.getElementById('crimeType').value);
  });

  // Activates knockout.js
  ko.applyBindings(new AppViewModel());
});


// instantiate map and supporting components for use globally
var map = null;
let largeInfowindow = null;
let drawingManager = null;
let polygon = null;

// instantiate markerCluster and heatMap variables for use globally
let markerCluster = null;
let heatMap = null;
let heatMapData = [];

// blank array for all crimes markers
let crimeMarkers = [];
// separate from crime markers, these will be for searching places
let placeMarkers = [];
// to store full list of data from API
let locations = [];


// intialize map object with default properties
function initMap() {
  const AUSTIN = {lat: 30.2672, lng: -97.7431};
  // set high level zoom on austin - higher zoom number is lower to the ground
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 10,
    center: AUSTIN
  });

  // instantiate infowindow
  largeInfowindow = new google.maps.InfoWindow();

  // call to APD API to get data
  // limiting and offsetting to get the most recent data in a usable size
  // filter for latitude > 1 to get ONLY crime data with lat/lng
  $.ajax({
    url: "https://data.austintexas.gov/resource/rkrg-9tez.json?$where=latitude > 1",
    type: "GET",
    data: {
      "$offset": 5000,
      // "$limit" : 500,
      "$limit" : 50,
      "$$app_token" : "TaNrAhtTuk3dVwHmpmMHRJJYX"
    }
  }).done(function(data) {

    for (let i = 0; i < data.length; i++) {
      locations.push({
        reportNum: data[i].incident_report_number,
        crimeType: data[i].crime_type,
        date: data[i].date,
        address: data[i].address,
        location: {
          lat: Number.parseFloat(data[i].latitude),
          lng: Number.parseFloat(data[i].longitude)
        }
      });
    }

    for (let i = 0; i < locations.length; i++) {
      let position = locations[i].location;
      let title = locations[i].crimeType;

      // create a new marker for each location
      let marker = new google.maps.Marker({
        position: position,
        title: title,
        animation: google.maps.Animation.DROP,
        id: i,
        date: formatDate(locations[i].date),
        reportNum: locations[i].reportNum
      });
      // add to markers array
      crimeMarkers.push(marker);

      // add listeners to open infowindow with crime details on click
      marker.addListener('click', setupCrimeMarkerListener);

      let latLng = new google.maps.LatLng(locations[i].location.lat, locations[i].location.lng);
      heatMapData.push(latLng);
    }

    // initialize the drawing manager
    drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_LEFT,
        drawingModes: [
          google.maps.drawing.OverlayType.POLYGON
        ]
      }
    });
    drawingManager.addListener('overlaycomplete', function(e) {
      activateDrawingMarkers(e);
    });

    // initialize heatmap layer
    heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatMapData,
      dissipating: true,
      map: map,
      radius: 50,
      opacity: 0.5
    });
    heatmap.setMap(null);

  });
}

// populates infowindow when a marker is clicked
// only one infowindow allowed open at a time
// data is populated based on markers position
// function populateCrimeInfoWindow(marker, infowindow) {
function populateCrimeInfoWindow(marker, infowindow) {
  let formattedReportNum = `${marker.reportNum.substring(0,4)}-${marker.reportNum.substring(4)}`;
  let content = `
    <div>${marker.title}</div>
    <div>Date: ${marker.date}</div>
    <div>Report Number:
      <a target='_blank' href='https://www.ci.austin.tx.us/police/reports/search2.cfm?choice=caseno&caseno=${formattedReportNum}&Submit=Submit'>
      ${formattedReportNum}</a>
    </div>`;

  populateInfoWindow(marker, content, infowindow);
}

function populatePlacesInfoWindow(marker, infowindow) {
  let placesService = new google.maps.places.PlacesService(map);
  placesService.getDetails({placeId: marker.id}, function(place, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      let content = `
        <div>${marker.title}</div>
        <div><a target='_blank' href='${place.website}'>${place.website}</a></div>`;

      populateInfoWindow(marker, content, infowindow);
    }
  });
}

function populateInfoWindow(marker, content, infowindow) {
  // check that the infowindow is not already opened on this marker
  if (infowindow.marker != marker) {
    // assign marker, content, and open infowindow
    infowindow.marker = marker;
    infowindow.setContent(content);
    infowindow.open(map, marker);

    // clear marker property if an infowindow is closed
    infowindow.addListener('closeclick', function() {
      infowindow.marker = null;
    });
  }
}



// hides arrays of markers
function hideMarkers(markers) {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
}



// handles drawing tools
function activateDrawingMarkers(event) {
  // if there is an existing polygon, get rid of it and remove the markers
  if (polygon) {
    polygon.setMap(null);
    hideMarkers(crimeMarkers);
  }
  // switch drawing mode to HAND and end drawing
  drawingManager.setDrawingMode(null);

  // update polygon based on the event overlay
  polygon = event.overlay;
  polygon.setEditable(true);

  // search area inside polygon, and redo search if it is changed
  searchWithinPolygon();
  polygon.getPath().addListener('set_at', searchWithinPolygon);
  polygon.getPath().addListener('insert_at', searchWithinPolygon);
}


// hides all markers outside polygon, and shows markers within
function searchWithinPolygon() {
  for (let i = 0; i < crimeMarkers.length; i++) {
    if (google.maps.geometry.poly.containsLocation(crimeMarkers[i].position, polygon)) {
      crimeMarkers[i].setMap(map);
    } else {
      crimeMarkers[i].setMap(null);
    }
  }
}



// function createMarkersForPlaces(places) {
//   let bounds = new google.maps.LatLngBounds();
//
//   for (let i = 0; i < places.length; i++) {
//     let place = places[i];
//     let icon = {
//       url: place.icon,
//       size: new google.maps.Size(35, 35),
//       origin: new google.maps.Point(0, 0),
//       anchor: new google.maps.Point(15, 34),
//       scaledSize: new google.maps.Size(25, 25)
//     };
//
//     let marker = new google.maps.Marker({
//       map: map,
//       icon: icon,
//       title: place.name,
//       position: place.geometry.location,
//       id: place.place_id
//     });
//     placeMarkers.push(marker);
//
//     // add listeners to open infowindow with place details on click
//     marker.addListener('click', setupPlaceMarkerListener);
//
//     if (place.geometry.viewport) {
//       bounds.union(place.geometry.viewport);
//     } else {
//       bounds.extend(place.geometry.location);
//     }
//   }
//   // map.fitBounds(bounds);
// }


// hide and show markers as different views
// options are standard, clustered, or heatmap
// resets view before setting to a new one
function toggleHeatmap() {
  resetMarkers();
  heatmap.setMap(map);
}

function toggleCluster() {
  resetMarkers();
  markerCluster = new MarkerClusterer(map, crimeMarkers, {imagePath: './m'});
  showCrimes(false);
}

function toggleStandard() {
  resetMarkers();
  showCrimes(false);
}


// filter the full locations array of all crimes by crime type
function filterCrimeMarkersType(crimeCode) {
  let filteredLocations = [];

  // default case, to return all locations unfiltered
  if (crimeCode === '6') {
    return locations;
  }

  // push to filtered array based on crime code
  locations.forEach(function(location) {
    switch (crimeCode) {
      // sex and rape
      case '1':
        if (location.crimeType.search(/sex|rape/i) > -1) {
          filteredLocations.push(location);
        }
        break;
      // theft and burglary
      case '2':
        if (location.crimeType.search(/burgl|theft|tress/i) > -1) {
          filteredLocations.push(location);
        }
        break;
      // assault
      case '3':
        if (location.crimeType.search(/assault|aslt/i) > -1) {
          filteredLocations.push(location);
        }
        break;
      // possession
      case '4':
        if (location.crimeType.search(/poss/i) > -1) {
          filteredLocations.push(location);
        }
        break;
      // driving
      case '5':
        if (location.crimeType.search(/dui|dwi|driving/i) > -1) {
          filteredLocations.push(location);
        }
        break;
      // other
      // case '6':
      default:
    }
  });
  updateCrimeMarkers(filteredLocations);
}


// updates array of crime markers after filtering by type or date
function updateCrimeMarkers(newLocations) {
  resetMarkers();
  // remove all references to previous markers, full delete
  crimeMarkers = [];

  for (let i = 0; i < newLocations.length; i++) {
    let position = newLocations[i].location;
    let title = newLocations[i].crimeType;

    // create a new marker for each location
    let marker = new google.maps.Marker({
      position: position,
      title: title,
      animation: google.maps.Animation.DROP,
      id: i,
      date: formatDate(newLocations[i].date),
      reportNum: newLocations[i].reportNum
    });
    // add to markers array
    crimeMarkers.push(marker);

    // add listeners to open infowindow with crime details on click
    marker.addListener('click', setupCrimeMarkerListener);

    let latLng = new google.maps.LatLng(newLocations[i].location.lat, newLocations[i].location.lng);
    heatMapData.push(latLng);

  }
  showCrimes();

  // re-check standard view by default
  document.getElementById('toggleStandard').checked = true;
}

// formats a raw floating timestamp to more common YYYY MMM DD
function formatDate(date) {
  let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let dateObj = new Date(date);
  let day = dateObj.getDate();
  let monthNum = dateObj.getMonth();
  let year = dateObj.getFullYear();

  return `${year} ${months[monthNum]} ${day}`;
}

// defines process for setting up this infowindow, to be added via listener
// after new markers are created for crimes
function setupCrimeMarkerListener () {
  return populateCrimeInfoWindow(this, largeInfowindow);
}
function setupPlaceMarkerListener (windowToPopulate) {
  return populatePlacesInfoWindow(this, largeInfowindow);
}
