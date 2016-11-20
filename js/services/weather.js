(function() {
    'use strict';

    function WeatherService($http) {
        var service = {};
        service.forcast = null;
        var geoloc = null;

        service.init = function(geoposition) {
            geoloc = geoposition;
            return $http.jsonp('https://api.forecast.io/forecast/'+config.forecast.key+'/'+geoposition.latitude+','+geoposition.longitude+'?units=si&callback=JSON_CALLBACK').
                then(function(response) {
                    return service.forcast = response;
                });
        };

        //Returns the current forcast along with high and low tempratures for the current day
        service.currentForcast = function() {
            if(service.forcast === null){
                return null;
            }
            service.forcast.data.currently.day = moment.unix(service.forcast.data.currently.time).format('ddd');
            switch(service.forcast.data.currently.icon) {
                case "rain":
                    service.forcast.data.currently.icon = "wi-rain";
                    break;
                case "cloudy":
                    service.forcast.data.currently.icon = "wi-cloudy";
                    break;
                default :
                    service.forcast.data.currently.icon = "wi-day-sunny";
                    break;
            }
            return service.forcast.data.currently;
        };

        service.weeklyForcast = function(){
            if(service.forcast === null){
                return null;
            }
            // Add human readable info to info
            for (var i = 0; i < service.forcast.data.daily.data.length; i++) {
                service.forcast.data.daily.data[i].day = moment.unix(service.forcast.data.daily.data[i].time).format('ddd');
            }
            return service.forcast.data.daily;
        };

        service.refreshWeather = function(){
            return service.init(geoloc);
        };

        return service;
    }

    angular.module('SmartMirror')
        .factory('WeatherService', WeatherService);

}());
