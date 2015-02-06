var app = app || {};
app.controller = app.controller || {};

(function ($) {
  app.controller.species = {
    init: function () {
      _log('species: init.');

      var $favButton = $("#species-profile-fav-button");
      $favButton.on('click', app.controller.species.toggleSpeciesFavourite);
    },

    show: function (event, ui) {
      _log('species: show.');

      var species = app.controller.list.getCurrentSpecies();

      var heading = $('#species_heading');
      heading.text(species.common_name);

      this.renderSpecies(species);
    },


    /**
     * Renders the species profile page.
     * @param species
     */
    renderSpecies: function (species) {
      var placeholder = $('#species-placeholder');

      //check for the favourite
      var favourites = app.controller.list.getFavourites();
      var $favButton = $("#species-profile-fav-button");
      if (favourites[species.id]) {
        $favButton.addClass("on");
      } else {
        $favButton.removeClass("on");
      }

      placeholder.html(app.templates.species_profile(species));
      placeholder.trigger('create');

      //add Gallery
      app.controller.species.gallery.init();

      //add button listeners
      $('#species-map-button, #species-map').on('click', function () {
        $('#species-map').toggle('slow');
      });

      var scale = $('#species-map').width() / 345;
      var margin = $('#species-map').height() * 0.05;

      $('#species-map-boundary')
        .attr('transform', 'scale(' + scale + ')')
        .attr('y', -margin);
      $('#species-map-data').attr('transform', 'scale(' + scale + ')')
        .attr('y', -margin);
    },

    /**
     * Toggles the current species as favourite by saving it into the
     * storage and changing the buttons appearance.
     */
    toggleSpeciesFavourite: function () {
      var $favButton = $("#species-profile-fav-button");
      $favButton.toggleClass("on");

      var species = app.controller.list.getCurrentSpecies();
      app.controller.list.changeFavourite(species.id, $favButton.hasClass('on'));
      app.controller.list.renderList();
    },

    /**
     *
     */
    gallery: {
      gallery: {},
      init: function (gallery_id) {
        var images = $('#species_gallery a');

        if (images.length > 0) {
          this.gallery = images.photoSwipe({
            jQueryMobile: true,
            loop: false,
            enableMouseWheel: false,
            enableKeyboard: false
          });
        }
      },

      show: function () {
        if ($('.gallery')) {
          this.gallery.show(0);
        } else {
          app.navigation.message('I have no pictures to show :(');
        }
      }
    }
  };
}(jQuery));
