'use strict';

<% if (socketIO) { %>
  var socket = io.connect(':9001');

<% } %>angular.module('<%= _.camelize(appname) %>App', [])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
