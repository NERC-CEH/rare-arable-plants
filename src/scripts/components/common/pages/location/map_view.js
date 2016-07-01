/** ****************************************************************************
 * Location main view.
 *****************************************************************************/
import $ from 'jquery';
import Marionette from 'marionette';
import L from 'leaflet';
import OSLeaflet from '../../../../../vendor/os-leaflet/js/OSOpenSpace';
import OsGridRef from '../../../../../vendor/latlon/js/osgridref';
import JST from '../../../../JST';
import LocHelp from '../../../../helpers/location';
import CONFIG from 'config'; // Replaced with alias

const DEFAULT_LAYER = 'OS';
const DEFAULT_CENTER = [53.7326306, -2.6546124];
const MAX_OS_ZOOM = L.OSOpenSpace.RESOLUTIONS.length - 1;
const OS_ZOOM_DIFF = 6;
const OS_CRS = L.OSOpenSpace.getCRS(); // OS maps use different projection

const GRID_STEP = 100000; // meters

export default Marionette.ItemView.extend({
  template: JST['common/location/map'],

  events: {
    'change #location-name': 'changeName',
  },

  changeName(e) {
    this.triggerMethod('location:name:change', $(e.target).val());
  },

  initialize() {
    this.map = null;
    this.layers = this._getLayers();

    this.currentLayerControlSelected = false;
    this.currentLayer = null;
    this.markerAdded = false;
  },

  onShow() {
    // set full remaining height
    const mapHeight = $(document).height() - 47 - 38.5;
    const $container = this.$el.find('#map')[0];
    $($container).height(mapHeight);

    this.initMap($container);
  },

  initMap($container) {
    this.map = L.map($container);

    // default layer
    this.currentLayer = this._getCurrentLayer();
    if (this.currentLayer === 'OS') this.map.options.crs = OS_CRS;

    // position view
    this.map.setView(this._getCenter(), this._getZoomLevel());

    // show default layer
    this.layers[this.currentLayer].addTo(this.map);

    this.map.on('baselayerchange', this._updateCoordSystem, this);
    this.map.on('zoomend', this.onMapZoom, this);

    // Controls
    this.addControls();

    // Marker
    this.addMapMarker();

    // Graticule
    this.addGraticule();
  },

  _getLayers() {
    const layers = {};
    layers.Satellite = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      id: CONFIG.map.mapbox_satellite_id,
      accessToken: CONFIG.map.mapbox_api_key,
      tileSize: 256, // specify as, OS layer overwites this with 200 otherwise
    });

    layers.OSM = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      id: CONFIG.map.mapbox_osm_id,
      accessToken: CONFIG.map.mapbox_api_key,
      tileSize: 256, // specify as, OS layer overwites this with 200 otherwise
    });

    let start = OsGridRef.osGridToLatLon(OsGridRef(0, 0));
    let end = OsGridRef.osGridToLatLon(OsGridRef(7 * GRID_STEP, 13 * GRID_STEP));
    let bounds = L.latLngBounds([start.lat, start.lon], [end.lat, end.lon]);

    layers.OS = L.tileLayer.OSOpenSpace(CONFIG.map.os_api_key);

    layers.OS.options.bounds = bounds;

    layers.OS.on('tileerror', tile => {
      let index = 0;
      const result = tile.tile.src.match(/missingTileString=(\d+)/i);
      if (result) {
        index = parseInt(result[1]);
        index++;

        // don't do it more than few times
        if (index < 4) {
          tile.tile.src = tile.tile.src.replace(/missingTileString=(\d+)/i, '&missingTileString=' + index);
        }
      } else {
        if (index === 0) {
          tile.tile.src = tile.tile.src + '&missingTileString=' + index;
        }
      }
    });
    return layers;
  },

  _getCurrentLayer() {
    let layer = DEFAULT_LAYER;
    const zoom = this._getZoomLevel();

    if (zoom > MAX_OS_ZOOM - 1) {
      layer = 'Satellite';
    }

    return layer;
  },

  _getCenter() {
    const currentLocation = this.model.get('recordModel').get('location') || {};
    let center = DEFAULT_CENTER;
    if (currentLocation.latitude && currentLocation.longitude) {
      center = [currentLocation.latitude, currentLocation.longitude];
    }
    return center;
  },

  addControls() {
    this.controls = L.control.layers({
      OS: this.layers.OS,
      OSM: this.layers.OSM,
      Satellite: this.layers.Satellite,
    }, {});
    this.map.addControl(this.controls);
  },

  addGraticule() {
    var polylinePoints = [];

    let lengthDirection = 1;
    for (let sideWays = 0; sideWays < 8; sideWays++) {
      let lenghtWays = 0
      if (lengthDirection < 0) lenghtWays = 13;

      let move = true;
      while (move) {
        const eastNorth = OsGridRef(sideWays * GRID_STEP, lenghtWays * GRID_STEP);
        let point = OsGridRef.osGridToLatLon(eastNorth);
        polylinePoints.push(new L.LatLng(point.lat, point.lon));

        if (lengthDirection < 0) {
          move = lenghtWays > 0
        } else {
          move = lenghtWays < 13;
        }
        lenghtWays += lengthDirection;
      }
      lengthDirection = -1 * lengthDirection;
    }

    lengthDirection = -1;
    for (let lengthWays = 0; lengthWays < 14; lengthWays++) {
      let sideWays = 7;
      if (lengthDirection > 0) sideWays = 0;

      let move = true;
      while (move) {
        const eastNorth = OsGridRef(sideWays * GRID_STEP, lengthWays * GRID_STEP);
        let point = OsGridRef.osGridToLatLon(eastNorth);
        polylinePoints.push(new L.LatLng(point.lat, point.lon));

        if (lengthDirection < 0) {
          move = sideWays > 0
        } else {
          move = sideWays < 7;
        }
        sideWays += lengthDirection;
      }
      lengthDirection = -1 * lengthDirection;
    }

    var polylineOptions = {
      color: '#08b7e8',
      weight: 0.5,
      opacity: 1
    };

    var polyline = new L.Polyline(polylinePoints, polylineOptions);

    this.map.addLayer(polyline);
  },

  /**
   * 1 gridref digits. (10000m)  -> < 3 map zoom lvl
   * 2 gridref digits. (1000m)   -> 5
   * 3 gridref digits. (100m)    -> 7
   * 4 gridref digits. (10m)     -> 9
   * 5 gridref digits. (1m)      ->
   */
  _getZoomLevel() {
    const currentLocation = this.model.get('recordModel').get('location') || {};
    let mapZoomLevel = 1;
    // check if record has location
    if (currentLocation.latitude && currentLocation.longitude) {
      // transform location accuracy to map zoom level
      switch (currentLocation.source) {
        case 'map':
          mapZoomLevel = currentLocation.accuracy + 1 || 1;

          // transition to OSM/Satellite levels if needed
          if (mapZoomLevel === MAX_OS_ZOOM) {
            mapZoomLevel += OS_ZOOM_DIFF;
          }

          // max safety
          mapZoomLevel = mapZoomLevel > 18 ? 18 : mapZoomLevel;

          // no need to show area as it would be smaller than the marker
          break;
        case 'gps':
          if (currentLocation.accuracy) {
            const digits = Math.log(currentLocation.accuracy) / Math.LN10;
            mapZoomLevel = digits ? 11 - digits * 2 : 10; // max zoom 10 (digits == 0)
            mapZoomLevel = Number((mapZoomLevel).toFixed(0)); // round the float
          } else {
            mapZoomLevel = 1;
          }
          break;
        case 'gridref':
          mapZoomLevel = currentLocation.accuracy + 1;
          break;
        default:
          mapZoomLevel = MAX_OS_ZOOM - 2;
      }
    }
    return mapZoomLevel;
  },

  _updateCoordSystem(e) {
    this.currentLayerControlSelected = this.controls._handlingClick;

    const center = this.map.getCenter();
    let zoom = this.map.getZoom();
    this.map.options.crs = e.name === 'OS' ? OS_CRS : L.CRS.EPSG3857;
    if (e.name === 'OS') {
      zoom -= OS_ZOOM_DIFF;
      if (zoom > MAX_OS_ZOOM - 1) {
        zoom = MAX_OS_ZOOM - 1;
      }
    } else if (this.currentLayer === 'OS') {
      zoom += OS_ZOOM_DIFF;
    }
    this.currentLayer = e.name;
    this.map.setView(center, zoom, { reset: true });
  },

  _getMarkerCoords() {
    const currentLocation = this.model.get('recordModel').get('location') || {};

    if (currentLocation.latitude && currentLocation.longitude) {
      return [currentLocation.latitude, currentLocation.longitude];
    }
    return [];
  },

  onMapZoom() {
    const zoom = this.map.getZoom();

    // -2 and not -1 because we ignore the last OS zoom level
    if (zoom > MAX_OS_ZOOM - 1 && this.currentLayer === 'OS') {
      this.map.removeLayer(this.layers.OS);
      this.map.addLayer(this.layers.Satellite);
    } else if ((zoom - OS_ZOOM_DIFF) <= MAX_OS_ZOOM - 1 && this.currentLayer === 'Satellite') {
      // only change base layer if user is on OS and did not specificly
      // select OSM/Satellite
      if (!this.currentLayerControlSelected) {
        this.map.removeLayer(this.layers.Satellite);
        this.map.addLayer(this.layers.OS);
      }
    }
  },

  addMapMarker() {
    const markerCoords = this._getMarkerCoords();

    /* add some event callbacks */
    const myIcon = L.divIcon({ className: 'icon icon-plus map-marker' });
    this.marker = L.marker(markerCoords, { icon: myIcon });

    if (markerCoords.length) {
      this.marker.addTo(this.map);
      // area.addTo(map);
      this.markerAdded = true;
    }

    this.map.on('click', this.onMapClick, this);

    // todo area
    //
    // // define rectangle geographical bounds
    // var bounds = [[54.559322, -5.767822], [56.1210604, -3.021240]];
    //
    // // create an orange rectangle
    // L.rectangle(bounds, {color: "#ff7800", weight: 1})
  },

  onMapClick(e) {
    this.marker.setLatLng(e.latlng).update();
    if (!this.markerAdded) {
      this.marker.addTo(this.map);
      this.markerAdded = true;
    }

    let zoom = this.map.getZoom();

    const location = {
      latitude: parseFloat(e.latlng.lat.toFixed(7)),
      longitude: parseFloat(e.latlng.lng.toFixed(7)),
      source: 'map',
      accuracy: zoom,
    };

    location.gridref = LocHelp.coord2grid(location, location.accuracy);

    // trigger won't work to bubble up
    this.triggerMethod('location:select:map', location);
  },

  serializeData() {
    const location = this.model.get('recordModel').get('location') || {};

    return {
      name: location.name,
    };
  },
});
