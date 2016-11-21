(function() {
    'use strict';

    function AlbumService($http, $q) {
        var service = {};
        service.cur_page = null;
        service.next_page = null;
        service.prev_page = null;

        service.requestAlbum = function(page) {
            var deffered = $q.defer();

            $http({
                'method':'GET',
                'url':config.SERVER_URL + '/api/photo/' + '?page=' + page
            }).success(function(response) {
                console.log(page + " page album : ", response);
//                $scope.album = response.result.cur;
                response.result.cur.forEach(function(elem, i) {
                    elem.id = (i+1);
                });
//                console.log("album is", $scope.album);
                service.next_page = response.result.next;
                service.prev_page = response.result.prev;
                console.log("success get album", response.result.cur);
                deffered.resolve(response.result.cur);
            }).error(function(error) {
                console.log("PHOTO get error", error);
                deffered.reject(error);
            });

            return deffered.promise;
        };

        service.getAlbum = function() {
            if(!service.cur_page) {
                service.cur_page = 1;
            }

            return service.requestAlbum(service.cur_page);
        };

        service.nextAlbumPage = function() {
            return service.requestAlbum(service.next_page);
        };

        service.prevAlbumPage = function() {
            return service.requestAlbum(service.prev_page);
        };


        return service;

    }

    angular.module('SmartMirror')
        .factory('AlbumService', AlbumService);

}());