'use strict';

angular.module('<%= _.camelize(appname) %>App')
  .controller('<%= _.classify(name) %>Ctrl', function ($scope, $http) {
    $scope.awesomeThings = [];<% if (socketIO) { %>
    socket.on('awesomeThings', function (data) {
      $scope.$apply(function () {
           $scope.awesomeThings.push(data.awesomeThings);
      });
      socket.emit('awesomeThingsReceived', { rogerThat: 'socket.IO is a very awesome thing!!!' });
    });<% } %>
    $http.get('/api/awesomeThings').success(function(awesomeThings) {
      awesomeThings.forEach(function(e,i) {
        $scope.awesomeThings.push(e);
      });
    });
  });
