/******************************************************************************
 * Main app router.
 *****************************************************************************/
define([
  'routers/routerExtention',
  'views/_page',
  'views/listPage',
  'views/speciesPage',
  'views/userPage',
  'views/loginPage',
  'views/registerPage',
  'views/recordPage',
  'views/datePage',
  'views/locationPage',
  'views/numberPage',
  'views/stagePage',
  'views/commentPage',
  'views/mgmtlocationPage',
  'views/locationdetailsPage',
  'helpers/download'
], function(ext, Page, ListPage, SpeciesPage, UserPage, LoginPage, RegisterPage,
            RecordPage, DatePage, LocationPage, NumberPage, StagePage,
            CommentPage, MgmtlocationPage, LocationdetailsPage, download) {
  'use strict';

  app.views = {};

  var Router = Backbone.Router.extend({
    /**
     * Initialize the router.
     */
    initialize: function () {
      _log('app.Router: initialize.', log.DEBUG);

      //track every route change as a page view in google analytics
      this.bind('route', this.trackPageview);

      //download app for offline usage
      if (app.CONF.OFFLINE.STATUS){
        setTimeout(download, 500);
      }

      this.listenTo(this, 'route', function (name, args) {

        console.log(name);
      });
    },

    /**
     * Routes to listen to.
     */
    routes: {
      "": function () {
        this.navigateToStandardPage('welcome');
      },

      "welcome": function () {
        this.navigateToStandardPage('welcome');
      },

      "list": {
        before: function(){},
        after: function(){
          if (app.views.listPage.scroll) {
            window.scrollTo(0, app.views.listPage.scroll);
          }
        },
        leave: function(){
          app.views.listPage.scroll = $(window).scrollTop();
        },
        route: function (id) {
          if (!app.views.listPage) {
            app.views.listPage = new ListPage();
          }
          var prevPageID = $.mobile.activePage ? $.mobile.activePage.attr('id') : '';
          this.changePage(app.views.listPage);

          app.views.listPage.update(prevPageID);
        }
      },

      "species/:id": function (id) {
        if (!app.views.speciesPage) {
          app.views.speciesPage = new SpeciesPage();
        }
        this.changePage(app.views.speciesPage);

        app.views.speciesPage.update(id);
      },

      "user": function () {
        if (!app.views.userPage) {
          app.views.userPage = new UserPage();
        }
        this.changePage(app.views.userPage);

        app.views.userPage.update();
      },

      "terms": function () {
        this.navigateToStandardPage('terms');
      },

      "login": function () {
        if (!app.views.loginPage) {
          app.views.loginPage = new LoginPage();
        }
        this.changePage(app.views.loginPage);
      },

      "register": function () {
        if (!app.views.registerPage) {
          app.views.registerPage = new RegisterPage();
        }
        this.changePage(app.views.registerPage);
      },

      "record/:id": function (id) {
        if (!app.views.recordPage) {
          app.views.recordPage = new RecordPage({model: app.models.record});
        }
        var prevPageID = $.mobile.activePage ? $.mobile.activePage.attr('id') : '';

        this.changePage(app.views.recordPage);
        app.views.recordPage.update(prevPageID, id);
      },

      "location": function () {
        if (!app.views.locationPage) {
          app.views.locationPage = new LocationPage({model: app.models.record});
        }
        this.changePage(app.views.locationPage);
        app.views.locationPage.update();
      },

      "number": function () {
        if (!app.views.numberPage) {
          app.views.numberPage = new NumberPage({model: app.models.record});
        }
        this.changePage(app.views.numberPage);
      },

      "locationdetails": function () {
        if (!app.views.locationDetailsPage) {
          app.views.locationDetailsPage = new LocationdetailsPage({model: app.models.record});
        }
        this.changePage(app.views.locationDetailsPage);
      },

      "stage": function () {
        if (!app.views.stagePage) {
          app.views.stagePage = new StagePage({model: app.models.record});
        }
        this.changePage(app.views.stagePage);
      },

      "comment": function () {
        if (!app.views.commentPage) {
          app.views.commentPage = new CommentPage({model: app.models.record});
        }
        this.changePage(app.views.commentPage);
      },

      "date": function () {
        if (!app.views.datePage) {
          app.views.datePage = new DatePage({model: app.models.record});
        }
        this.changePage(app.views.datePage);
      },

      "mgmt": function () {
        this.navigateToStandardPage('mgmt');
      },

      "mgmtlocation": function () {
        if (!app.views.mgmtlocationPage){
          app.views.mgmtlocationPage = new MgmtlocationPage();
        }
        this.changePage(app.views.mgmtlocationPage);
      },

      "mgmtconservation": function () {
        this.navigateToStandardPage('mgmtconservation');
      },

      "mgmtundesirable": function () {
        this.navigateToStandardPage('mgmtundesirable');
      },


      "mgmtschemes": function () {
        this.navigateToStandardPage('mgmtschemes');
      },

      "info": function () {
        this.navigateToStandardPage('info');
      },

      "about": function () {
        this.navigateToStandardPage('about');
      },

      "credits": function () {
        this.navigateToStandardPage('credits');
      },

      "privacy": function () {
        this.navigateToStandardPage('privacy');
      },

      "brc-approved": function () {
        this.navigateToStandardPage('brc-approved');
      }
    },

    /**
     * If the JQM page needs no controller and uses a rather static template
     * we can use this function to create the view and open it as a page.
     *
     * @param pageID the ID of a page that matches the template name
     */
    navigateToStandardPage: function (pageID) {
      if (!app.views[pageID + 'Page']) {
        app.views[pageID + 'Page'] = new Page(pageID);
      }
      this.changePage(app.views[pageID + 'Page']);
    },

    /**
     * Since the JQM page navigation is disabled with backbone this navigates to
     * a new page view.
     *
     * @param page backbone page view
     */
    changePage: function (page) {
      // We turned off $.mobile.autoInitializePage, but now that we've
      // added our first page to the DOM, we can now call initializePage.
      if (!this.initializedFirstPage) {
        _log('app.Router: loading first page.', log.DEBUG);

        $.mobile.initializePage();
        this.initializedFirstPage = true;
      }

      //update the URL hash
      $(":mobile-pagecontainer").pagecontainer("change", '#' + page.id,
        {changeHash: false});
    },

    /**
     * Google analytics to track the page navigation.
     */
    trackPageview: function () {
      //Google Analytics
      if (app.CONF.GA.STATUS) {
        require(['ga'], function(ga) {
          var url = Backbone.history.getFragment();

          // Add a slash if neccesary
          if (!/^\//.test(url)) url = '/' + url;

          // Record page view
          ga('send', {
            'hitType': 'pageview',
            'page': url
          });
        });
      }
    }
  });

  return Router;
});