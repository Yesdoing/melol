(function(angular) {
    'use strict';

    function MirrorCtrl(
            SpeechService,
            AutoSleepService,
            GeolocationService,
            WeatherService,
            MapService,
            GiphyService,
            SearchService,
            SoundCloudService,
            AudioService,
            $rootScope, $scope, $timeout, $interval, tmhDynamicLocale, $translate, $http) {

        // Local Scope Vars
        var _this = this;
        $scope.listening = false;
        $scope.debug = false;
        $scope.focus = "default";

        /* 테스트 .. */
        setTimeout(function() {
            SpeechService.trigger("음악 재생");
        }, 1000);

        $scope.user = {};
        $scope.commands = [];
        $scope.partialResult = $translate.instant('home.commands');
        $scope.config = config;

        $scope.show_schedule = true;
        $scope.schedule_list = [];

        $scope.getSchedules = function() {
            $http({
                method: 'GET',
                url: config.SERVER_URL + '/api/schedules'
            }).then(function successCallback(response) {
                var today =  new Date();
                for(var i = 0; i < response.data.result.length; i++) {
                    if (Date.parse(response.data.result[i].end_date) <= Date.parse(today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate())) {
                        response.data.result[i].status = 'late';
                    }
                }
                $scope.schedule_list = response.data.result;
                console.log("schedule list", $scope.schedule_list);
            }, function errorCallback(response) {
                console.log(response);
            });
        };

        $scope.getSubwayInfo = function() {
            $http({
                'method':'GET',
                'url':config.SERVER_URL+'/api/platforms/favorites'
            }).success(function(response) {
                $scope.platforms = response.result;
                console.log("Success Subway", $scope.platforms);
            }).error(function(response){
                console.log("Error!!!", response);
            });
        };

        //set lang
        var resetCommandTimeout;
        //Initialize the speech service
        SpeechService.init({
            listening : function(listening){
                $scope.listening = listening;
            },
            partialResult : function(result){
                $scope.partialResult = result;
                $timeout.cancel(resetCommandTimeout);
            },
            finalResult : function(result){
                if(typeof result !== 'undefined'){
                    $scope.partialResult = result;
                    resetCommandTimeout = $timeout(restCommand, 5000);
                }
            },
            error : function(error){
                console.log(error);
                if(error.error == "network"){
                    $scope.speechError = "Google Speech Recognizer: Network Error (Speech quota exceeded?)";
                }
            }
        });

        //Update the time
        function updateTime(){
//            $scope.date = new moment();
            $scope.date = new Date();

            // Auto wake at a specific time
            if (typeof config.autoTimer !== 'undefined' && typeof config.autoTimer.auto_wake !== 'undefined' && config.autoTimer.auto_wake == moment().format('HH:mm:ss')) {
                console.debug('Auto-wake', config.autoTimer.auto_wake);
                $scope.focus = "default";
                AutoSleepService.wake();
                AutoSleepService.startAutoSleepTimer();
            }
        }

        // Reset the command text
        var restCommand = function(){
            $translate('home.commands').then(function (translation) {
                $scope.partialResult = translation;
            });
        };

        /**
         * Register a refresh callback for a given interval (in minutes)
         */
        var registerRefreshInterval = function(callback, interval){
            //Load the data initially
            callback();
            if(typeof interval !== 'undefined'){
                $interval(callback, interval * 60000);
            }
        };

        _this.init = function() {
            AutoSleepService.startAutoSleepTimer();

            var tick = $interval(updateTime, 1000);

            $scope.getSchedules();

            updateTime();

//            GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
//                console.log("Geoposition", geoposition);
//                $scope.map = MapService.generateMap(geoposition.coords.latitude+','+geoposition.coords.longitude);
//            });

            restCommand();

            //Initialize SoundCloud
            var playing = false, sound;
            SoundCloudService.init();

            var refreshWeatherData = function() {
                //Get our location and then get the weather for our location
                GeolocationService.getLocation().then(function (geoposition) {
                    WeatherService.init(geoposition).then(function () {
                        $scope.currentForcast = WeatherService.currentForcast();
                        console.log("geoposition is", geoposition);
                        console.log("현재 날씨는... ", $scope.currentForcast);
                    });
                });
            };

            if(typeof config.forecast !== 'undefined'){
                registerRefreshInterval(refreshWeatherData, config.forecast.refreshInterval || 2);
            }

            var greetingUpdater = function () {
                if(typeof config.greeting !== 'undefined' && !Array.isArray(config.greeting) && typeof config.greeting.midday !== 'undefined') {
                    var hour = moment().hour();
                    var greetingTime = "midday";

                    if (hour > 4 && hour < 11) {
                        greetingTime = "morning";
                    } else if (hour > 18 && hour < 23) {
                        greetingTime = "evening";
                    } else if (hour >= 23 || hour < 4) {
                        greetingTime = "night";
                    }
                    var nextIndex = Math.floor(Math.random() * config.greeting[greetingTime].length);
                    var nextGreeting = config.greeting[greetingTime][nextIndex]
                    $scope.greeting = nextGreeting;
                }else if(Array.isArray(config.greeting)){
                    $scope.greeting = config.greeting[Math.floor(Math.random() * config.greeting.length)];
                }
            };

            if(typeof config.greeting !== 'undefined'){
                registerRefreshInterval(greetingUpdater, 60);
            }

            var defaultView = function() {
                console.debug("Ok, going to default view...");

                $scope.focus = "default";
            };

            var addCommand = function(commandId, commandFunction){
                var voiceId = 'commands.'+commandId+'.voice';
                var textId = 'commands.'+commandId+'.text';
                var descId = 'commands.'+commandId+'.description';
                $translate([voiceId, textId, descId]).then(function (translations) {
                    SpeechService.addCommand(translations[voiceId], commandFunction);
                    if (translations[textId] !== '') {
                        var command = {"text": translations[textId], "description": translations[descId]};
                        $scope.commands.push(command);
                    }
                });
            };

            // List commands
            addCommand('list', function() {
                console.debug("Here is a list of commands...");
                console.log(SpeechService.commands);
                $scope.focus = "commands";
            });

            // Go back to default view
            addCommand('home', defaultView);

            // Hide everything and "sleep"
            addCommand('sleep', function() {
                console.debug("Ok, going to sleep...");
                $scope.focus = "sleep";
            });

            // Go back to default view
            addCommand('wake_up', defaultView);

//            // Turn off HDMI output
//            addCommand('screen_off', function() {
//                console.debug('turning screen off');
//                AutoSleepService.sleep();
//            });
//
//            // Turn on HDMI output
//            addCommand('screen_on', function() {
//                console.debug('turning screen on');
//                AutoSleepService.wake();
//                $scope.focus = "default"
//            });

            // Show map
            addCommand('map_show', function() {
                console.debug("Going on an adventure?");
                GeolocationService.getLocation().then(function(geoposition){
                    console.log("Geoposition", geoposition);
                    $scope.map = MapService.generateMap(geoposition.latitude+','+geoposition.longitude);
                    $scope.focus = "map";
                });
            });

            // Hide everything and "sleep"
            addCommand('map_location', function(location) {
                console.debug("Getting map of", location);
                $scope.map = MapService.generateMap(location);
                $scope.focus = "map";
            });

            // Zoom in map
            addCommand('map_zoom_in', function() {
                console.debug("Zoooooooom!!!");
                $scope.map = MapService.zoomIn();
            });

            addCommand('map_zoom_out', function() {
                console.debug("Moooooooooz!!!");
                $scope.map = MapService.zoomOut();
            });

            addCommand('subway', function() {
                $scope.getSubwayInfo();
                $scope.focus = 'subway';
            });

            //SoundCloud search and play
            addCommand('sc_play', function(query) {
                SoundCloudService.searchSoundCloud(query).then(function(response){
                    if (response[0].artwork_url){
                        $scope.scThumb = response[0].artwork_url.replace("-large.", "-t500x500.");
                    } else {
                        $scope.scThumb = 'http://i.imgur.com/8Jqd33w.jpg?1';
                    }
                    $scope.scWaveform = response[0].waveform_url;
                    $scope.scTrack = response[0].title;
                    $scope.focus = "sc";
                    SoundCloudService.play();
                });
            });

            //SoundCloud stop
            addCommand('sc_pause', function() {
                SoundCloudService.pause();
                $scope.focus = "default";
            });
            //SoundCloud resume
            addCommand('sc_resume', function() {
                SoundCloudService.play();
                $scope.focus = "sc";
            });
            //SoundCloud replay
            addCommand('sc_replay', function() {
                SoundCloudService.replay();
                $scope.focus = "sc";
            });

            addCommand('schedule_show', function() {
               $scope.show_schedule = true;
               console.log("일정이 보여집니다.");
            });

            addCommand('schedule_hide', function() {
                $scope.show_schedule = false;
                console.log("일정이 숨겨집니다.");
            });

            //Search for a video
            addCommand('youtube_play', function(keyword){
                SearchService.searchYouTube(keyword).then(function(results){
                    //Set cc_load_policy=1 to force captions
                    $scope.video = 'http://www.youtube.com/embed/'+results.data.items[0].id.videoId+'?autoplay=1&controls=0&iv_load_policy=3&enablejsapi=1&showinfo=0';
                    $scope.focus = "video";
                });
            });

            //Stop video
            addCommand('youtube_stop', function() {
              var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
              iframe.postMessage('{"event":"command","func":"' + 'stopVideo' +   '","args":""}', '*');
              $scope.focus = "default";
            });


            //Play music
            addCommand('music_play', function() {
                AudioService.init();
                $scope.listening_music = true;
            });

            addCommand('music_pause', function() {
                AudioService.stopMusic();
            });

            addCommand('music_resume', function() {
                AudioService.resumeMusic();
            });

            addCommand('music_prev', function() {
                AudioService.prevMusic();
            });

            addCommand('music_next', function() {
                AudioService.nextMusic();
            });

            addCommand('music_exit', function() {
                AudioService.exitMusic();
                $scope.listening_music = false;
            });

            // Check the time
            addCommand('time_show', function(task) {
                 console.debug("It is", moment().format('h:mm:ss a'));
            });

            //Show giphy image
            addCommand('image_giphy', function(img) {
                GiphyService.init(img).then(function(){
                    $scope.gifimg = GiphyService.giphyImg();
                    $scope.focus = "gif";
                });
            });
        };
        _this.init();
    }

    angular.module('SmartMirror')
        .controller('MirrorCtrl', MirrorCtrl);

}(window.angular));
