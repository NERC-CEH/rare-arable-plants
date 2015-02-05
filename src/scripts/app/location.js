var app = app || {};
app.controller = app.controller || {};

(function ($) {
  app.controller.location = {
    saveData: false,

    pagecreate: function () {
      _log('location: pagecreate.');

      if (typeof google === 'undefined') {
        $('#location-opts').disableTab(1);

        /*
         If the browser is offline then we should not proceed and so the
         dummyText controls the caching of the file - always get fresh
         */
        var dummyText = '&' + (new Date()).getTime();
        app.controller.location.loadScript('http://maps.googleapis.com/maps/api/js?sensor=false&' +
          'callback=app.controller.location.initializeMap' +
          dummyText
        );
      }
    },

    pagecontainershow: function (e, data) {
      app.controller.location.renderGPStab('init');
      this.saveData = false; //reset
    },

    /**
     * TODO: OBSOLETE
     * @param e
     * @param data
     */
    pagecontainerbeforechange: function (e, data) {
      _log('location: pagecontainerbeforechange.');
      if (typeof data.toPage === 'object' && data.toPage[0]) {
        nextPage = data.toPage[0].id;

        if (this.saveData && this.accuracy !== -1) {
          var location = this.saveLocation();
          //Save button
          switch (nextPage) {
            case 'record':
              app.controller.record.saveLocation(location);
              break;
            case 'list':
              app.controller.list.prob.runFilter();
              break;
            default:
              _log('location: ERROR changing to unknown page.');
          }
        } else {
          //Cancel button
          switch (nextPage) {
            case 'list':
              //the filter needs to be removed if canceled
              // at the location stage
              var filter = {'id': 'probability'};
              app.controller.list.removeFilter(filter);
              break;
            default:
              _log('location: ERROR changing to unknown page.');
          }
        }
      }
    },

    saveLocation: function () {
      //save in storage
      var location = {
        'lat': this.latitude,
        'lon': this.longitude,
        'acc': this.accuracy
      };
      morel.settings('location', location);
      morel.geoloc.set(location.lat, location.lon, location.acc);
      return location;
    },

    /**
     * Should be overwritten by page-specific saving procedure
     */
    save: function () {
      _log('location: saving location.');
      this.saveData = true;
    },

    map: {},
    latitude: null,
    longitude: null,
    accuracy: -1,

    set: function (lat, lon, acc) {
      this.latitude = lat;
      this.longitude = lon;
      this.accuracy = acc;
    },

    get: function () {
      return {
        'lat': this.latitude,
        'lon': this.longitude,
        'acc': this.accuracy
      };
    },

    updateCoordinateDisplay: function (lat, lon, acc) {
      var info = 'Your coordinates: ' + lat + ', ' + lon + ' (Accuracy: ' + acc + ')';
      $('#coordinates').text(info);
    },

    renderGPStab: function (state, location) {
      var template = null;
      var placeholder = $('#location-gps-placeholder');
      var gref = "";
      var data = {};

      switch (state) {
        case 'init':
          var currentLocation = app.controller.location.get();
          if (currentLocation.acc === -1) {
            currentLocation = null;
          } else {
            location = currentLocation;
          }

          template = $('#location-gps').html();
          break;
        case 'running':
          template = $('#location-gps-running').html();
          break;
        case 'finished':
          template = $('#location-gps-finished').html();
          break;
        default:
          _log('location: unknown render gps tab.');
      }

      if (location) {
        var p = new LatLonE(location.lat, location.lon, LatLonE.datum.OSGB36);
        var grid = OsGridRef.latLonToOsGrid(p);
        gref = grid.toString();
        location.gref = gref;
        data.location = location;
      }

      var compiled_template = Handlebars.compile(template);
      placeholder.html(compiled_template(data));
      placeholder.trigger('create');

      //attach event listeners
      $('#gps-start-button').on('click', app.controller.location.startGeoloc);
      $('#gps-stop-button').on('click', app.controller.location.stopGeoloc);
      $('#gps-improve-button').on('click', app.controller.location.startGeoloc);

    },

    /**
     * Starts a geolocation service and modifies the DOM with new UI.
     */
    startGeoloc: function () {
      $.mobile.loading('show');

      function onUpdate(location) {
        //if improved update current location
        var currentLocation = app.controller.location.get();
        if (currentLocation.acc === -1 || location.acc <= currentLocation.acc) {
          currentLocation = location;
          app.controller.location.set(location.lat, location.lon, location.acc);
        } else {
          location = currentLocation;
        }

        //modify the UI
        app.controller.location.renderGPStab('running', location);
      }

      function onSuccess(location) {
        $.mobile.loading('hide');

        app.controller.location.set(location.lat, location.lon, location.acc);
        app.controller.location.renderGPStab('finished', location);
      }

      function onError(err) {
        $.mobile.loading('show', {
          text: "Sorry! " + err.message + '.',
          theme: "b",
          textVisible: true,
          textonly: true
        });
        setTimeout(function () {
          $.mobile.loading('hide');
        }, 5000);

        //modify the UI

        app.controller.location.renderGPStab('init');
      }

      //start geoloc
      morel.geoloc.run(onUpdate, onSuccess, onError);

      var location = null;
      var currentLocation = app.controller.location.get();
      if (currentLocation.acc !== -1) {
        location = currentLocation;
      }

      //modify the UI
      app.controller.location.renderGPStab('running', location);
    },

    /**
     * Stops any geolocation service and modifies the DOM with new UI.
     */
    stopGeoloc: function () {
      $.mobile.loading('hide');

      //stop geoloc
      morel.geoloc.stop();

      //modify the UI
      app.controller.location.renderGPStab('init');
    },

    /**
     * Mapping
     */
    initializeMap: function () {
      _log("location: initialising map.");
      //todo: add checking
      var mapCanvas = $('#map-canvas')[0];
      var mapOptions = {
        zoom: 5,
        center: new google.maps.LatLng(57.686988, -14.763319),
        zoomControl: true,
        zoomControlOptions: {
          style: google.maps.ZoomControlStyle.SMALL
        },
        panControl: false,
        linksControl: false,
        streetViewControl: false,
        overviewMapControl: false,
        scaleControl: false,
        rotateControl: false,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
        },
        styles: [
          {
            "featureType": "landscape",
            "stylers": [
              {"hue": "#FFA800"},
              {"saturation": 0},
              {"lightness": 0},
              {"gamma": 1}
            ]
          },
          {
            "featureType": "road.highway",
            "stylers": [
              {"hue": "#53FF00"},
              {"saturation": -73},
              {"lightness": 40},
              {"gamma": 1}
            ]
          },
          {
            "featureType": "road.arterial",
            "stylers": [
              {"hue": "#FBFF00"},
              {"saturation": 0},
              {"lightness": 0},
              {"gamma": 1}
            ]
          },
          {
            "featureType": "road.local",
            "stylers": [
              {"hue": "#00FFFD"},
              {"saturation": 0},
              {"lightness": 30},
              {"gamma": 1}
            ]
          },
          {
            "featureType": "water",
            "stylers": [
              {"saturation": 43},
              {"lightness": -11},
              {"hue": "#0088ff"}
            ]
          },
          {
            "featureType": "poi",
            "stylers": [
              {"hue": "#679714"},
              {"saturation": 33.4},
              {"lightness": -25.4},
              {"gamma": 1}
            ]
          }
        ]
      };
      this.map = new google.maps.Map(mapCanvas, mapOptions);
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(-25.363, 131.044),
        map: app.controller.location.map,
        icon: 'http://maps.google.com/mapfiles/marker_green.png',
        draggable: true
      });
      marker.setVisible(false);

      var update_timeout = null; //to clear changing of marker on double click
      google.maps.event.addListener(this.map, 'click', function (event) {
        //have to wait for double click
        update_timeout = setTimeout(function () {
          var latLng = event.latLng;
          marker.setPosition(latLng);
          marker.setVisible(true);
          updateMapCoords(latLng);
        }, 200);
      });

      //removes single click action
      google.maps.event.addListener(this.map, 'dblclick', function (event) {
        clearTimeout(update_timeout);
      });

      google.maps.event.addListener(marker, 'dragend', function () {
        var latLng = marker.getPosition();
        updateMapCoords(latLng);
      });

      //Set map centre
      if (this.latitude && this.longitude) {
        var latLong = new google.maps.LatLng(this.latitude, this.longitude);
        app.controller.location.map.setCenter(latLong);
        app.controller.location.map.setZoom(15);
      } else if (navigator.geolocation) {
        //Geolocation
        var options = {
          enableHighAccuracy: true,
          maximumAge: 60000,
          timeout: 5000
        };

        navigator.geolocation.getCurrentPosition(function (position) {
          var latLng = new google.maps.LatLng(position.coords.latitude,
            position.coords.longitude);
          app.controller.location.map.setCenter(latLng);
          app.controller.location.map.setZoom(15);
        }, null, options);
      }

      this.fixTabMap("#location-opts", '#map');

      //todo: create event
      $('#location-opts').enableTab(1);

      function updateMapCoords(mapLatLng) {
        var location = {
          'lat': mapLatLng.lat(),
          'lon': mapLatLng.lng()
        };
        app.controller.location.set(location.lat, location.lon, 1);

        updateMapInfoMessage('#map-message', location);
      }

      function updateMapInfoMessage(id, location) {
        //convert coords to Grid Ref
        var p = new LatLonE(location.lat, location.lon, LatLonE.datum.OSGB36);
        var grid = OsGridRef.latLonToOsGrid(p);
        var gref = grid.toString();

        var message = $(id);
        message.removeClass();
        message.addClass('success-message');
        message.empty().append('<p>Grid Ref:<br/>' + gref + '</p>');
      }
    },

    /**
     * Fix one tile rendering in jQuery tabs
     * @param tabs
     * @param mapTab
     */
    fixTabMap: function (tabs, mapTab) {
      $(tabs).on("tabsactivate.googleMap", function (event, ui) {
          //check if this is a map tab
          if (ui.newPanel.selector === mapTab) {
            google.maps.event.trigger(app.controller.location.map, 'resize');
            if (app.controller.location.latitude !== null && app.controller.location.longitude !== null) {
              var latLong = new google.maps.LatLng(app.controller.location.latitude,
                app.controller.location.longitude);

              app.controller.location.map.setCenter(latLong);
              app.controller.location.map.setZoom(15);
            }
            $(tabs).off("tabsactivate.googleMap");
          }
        }
      );
    },

    gridRefConvert: function () {
      var val = $('#grid-ref').val();
      var gridref = OsGridRef.parse(val);
      if (!isNaN(gridref.easting) && !isNaN(gridref.northing)) {
        var latLon = OsGridRef.osGridToLatLon(gridref);
        this.set(latLon.lat, latLon.lon, 1);

        var gref = val.toUpperCase();
        var message = $('#gref-message');
        message.removeClass();
        message.addClass('success-message');
        message.empty().append('<p>Grid Ref:<br/>' + gref + '</p>');
      }
      //todo: set accuracy dependant on Gref
    },

    /**
     * Loads the google maps script.
     *
     * @param src
     */
    loadScript: function (src) {
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = src;
      document.body.appendChild(script);
    }
  };




}(jQuery));