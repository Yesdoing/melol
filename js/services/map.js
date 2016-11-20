(function(annyang) {
    'use strict';

    function MapService() {
        var service = {};
        service.center = null;
        service.zoom = 13; //default zoom is 13

        service.generateMap = function(target) {
            service.center = target;

            var mapUrl = "https://maps.googleapis.com/maps/api/staticmap?center="+target+
                "&zoom="+service.zoom+"&format=png&sensor=false&scale=2&size="+window.innerWidth+
                "x1200&maptype=roadmap&style=visibility:on|weight:1|invert_lightness:true|saturation:-100|lightness:1";

            return mapUrl;
        };

        service.zoomIn = function() {
            service.zoom = service.zoom + 1;
            return service.generateMap(service.center);
        };

        service.zoomOut = function() {
            service.zoom = service.zoom - 1;
            return service.generateMap(service.center);
        };

        return service;
    }

    angular.module('SmartMirror')
        .factory('MapService', MapService);

}(window.annyang));
