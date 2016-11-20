(function() {
    'use strict';

    function GeolocationService($q,$rootScope,$window, $http) {
        var service = {};
        var geolocation_msgs = {
            'errors.location.unsupportedBrowser':'Browser does not support location services',
            'errors.location.permissionDenied':'You have rejected access to your location',
            'errors.location.positionUnavailable':'Unable to determine your location',
            'errors.location.timeout':'Service timeout has been reached'
        };

        service.getLocation = function () {
            var deferred = $q.defer();
            if ($window.navigator && $window.navigator.geolocation) {
                $http({
                    'method':'get',
                    'url':'http://ipinfo.io'
                }).success(function(ipinfo) {
                    var position = {
                        'latitude':ipinfo.loc.split(",")[0],
                        'longitude':ipinfo.loc.split(",")[1]
                    };
                    deferred.resolve(position);
                }).error(function(error) {
                    switch (error.code) {
                        case 1:
                            $rootScope.$broadcast('error',geolocation_msgs['errors.location.permissionDenied']);
                            $rootScope.$apply(function() {
                                deferred.reject(geolocation_msgs['errors.location.permissionDenied']);
                            });
                            break;
                        case 2:
                            $rootScope.$broadcast('error',geolocation_msgs['errors.location.positionUnavailable']);
                            $rootScope.$apply(function() {
                                deferred.reject(geolocation_msgs['errors.location.positionUnavailable']);
                            });
                            break;
                        case 3:
                            $rootScope.$broadcast('error',geolocation_msgs['errors.location.timeout']);
                            $rootScope.$apply(function() {
                                deferred.reject(geolocation_msgs['errors.location.timeout']);
                            });
                            break;
                    }
                });
            }
            else {
                $rootScope.$broadcast('error',geolocation_msgs['errors.location.unsupportedBrowser']);
                $rootScope.$apply(function(){deferred.reject(geolocation_msgs['errors.location.unsupportedBrowser']);});
            }
            return deferred.promise;
        };
        
        return service;

    }

    angular.module('SmartMirror')
        .factory('GeolocationService', GeolocationService);

}());