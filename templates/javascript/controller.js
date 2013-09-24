'use strict';

angular.module('<%= _.camelize(appname) %>App')
  .controller('<%= _.classify(name) %>Ctrl', function ($scope, $http) {
    $scope.awesomeThings = [];<% if (socketIO) { %>
    var getThingsFromSocket = function getThingsFromSocket() {
      socket.emit('getThings', function(d) {
        $scope.$apply(function () {
          $scope.awesomeThings.push(d.awesomeThings);
        });
        socket.emit('awesomeThingsReceived', { rogerThat: 'socket.IO is a very awesome thing!!!' });
      });
    };
    if (socket.socket.connected) {
      getThingsFromSocket();
    } else {
      var once = false;
      socket.once('connect', function() {
        if (!once) {
          once = true;
          getThingsFromSocket();
        }
      });
      socket.once('reconnect', function() {
        if (!once) {
          once = true;
          getThingsFromSocket();
        }
      });
    }<% } %>
    $http.get('/api/awesomeThings').success(function(awesomeThings) {
      awesomeThings.forEach(function(e,i) {
        $scope.awesomeThings.push(e);
      });
    });
  });
