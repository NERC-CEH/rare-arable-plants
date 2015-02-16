var app = app || {};
app.models = app.models || {};
app.collections = app.collections || {};

(function () {
  'use strict';

  var Specie = Backbone.Model.extend({
    defaults: {
      id: "",
      warehouse_id: 0,
      taxon: "",
      common_name: "",
      profile_pic: "images/sample.jpg",
      description: "",
      management: "",
      favourite: false
    }
  });

  var Species = Backbone.Collection.extend({
    model: Specie,

    localStorage: new Backbone.LocalStorage(app.CONF.NAME),

    initialize: function (species) {
      this.fetch();

      this.listenTo(app.models.user, 'change', this.updateFavourites);

      // Udate the species with favourites for first time
      var favourites = app.models.user.get('favourites');
      _.each(species, function(specie){
        if (favourites.indexOf(specie.id) >= 0) {
          specie.favourite = true;
        } else {
          specie.favourite = false;
        }
      });

    },

    loadData: function () {
      $.ajax({
        url: app.CONF.SPECIES_DATA_SRC,
        dataType: 'json',
        async: false,
        success: function (json) {

        }
      });
    },

    updateFavourites: function () {
      var favourites = app.models.user.get('favourites');
      _.each(this.models, function(model){
        if (favourites.indexOf(model.get('id')) >= 0) {
          model.set('favourite', true);
        } else {
          model.set('favourite', false);
        }
      });
    }
  });

  var User = Backbone.Model.extend({
    id: 'user',

    defaults: {
      name: '',
      email: '',
      password: '',
      location: null,
      location_acc: -1,
      sort: 'common_name',
      filters: [],
      favourites: []
    },

    initialize: function () {
      this.fetch();
    },

    // Save all of the todo items under the `"todos-backbone"` namespace.
    localStorage: new Backbone.LocalStorage(app.CONF.NAME),

    signOut: function () {
      this.set('email', '');
      this.set('password', '');
      this.save();
    },

    toggleFavouriteSpecies: function (speciesID) {
      var favourites = _.clone(this.get('favourites'));  //CLONING problem as discussed:
      //https://stackoverflow.com/questions/9909799/backbone-js-change-not-firing-on-model-change

      if (_.indexOf(favourites, speciesID) >= 0) {
        favourites = _.without(favourites, speciesID);
      } else {
        favourites.push(speciesID);
      }

      this.save('favourites', favourites);
    },

    isFavourite: function (speciesID) {
      var favourites = this.get('favourites');
      return _.indexOf(favourites, speciesID);
    },

    toggleListFilter: function (filterID) {
      var filters = _.clone(this.get('filters'));  //CLONING problem as discussed:
      //https://stackoverflow.com/questions/9909799/backbone-js-change-not-firing-on-model-change

      if (_.indexOf(filters, filterID) >= 0) {
        filters = _.without(filters, filterID);
      } else {
        filters.push(filterID);
      }

      this.save('filters', filters);
    }
  });

  //create global
  app.models.user = new User();
  app.collections.species = new Species();

})();