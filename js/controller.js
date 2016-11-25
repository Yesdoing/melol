(function(angular) {
    'use strict';

    function MirrorCtrl(
            SpeechService,
            AutoSleepService,
            GeolocationService,
            WeatherService,
            MapService,
            SearchService,
            AudioService,
            AlbumService,
            $scope, $timeout, $interval, $translate, $http) {

        // Local Scope Vars
        var _this = this;
        $scope.listening = false;
        $scope.debug = false;
        $scope.focus = "default";
        var socket = io.connect(config.SOCKET_SERVER_URL);
        const {ipcRenderer} = require('electron');

        /* 테스트 .. */
        setTimeout(function() {
//            SpeechService.trigger("음악 재생");
//            SpeechService.trigger("앨범 보여 줘")
//            SpeechService.trigger("지하철 정보");
//            SpeechService.trigger("지도 보자");
//            SpeechService.trigger("손흥민 동영상 보여 줘");
//            SpeechService.trigger("카메라");
//            SpeechService.trigger("사용 가능한 질문");
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
            restCommand();

            var refreshWeatherData = function() {
                //Get our location and then get the weather for our location
                GeolocationService.getLocation().then(function (geoposition) {
                    console.log("My GeoPosition is", geoposition);
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
                    var nextGreeting = config.greeting[greetingTime][nextIndex];
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

            addCommand('hi', function() {
                $scope.$apply(function() {
                    $scope.isSayHi = true;
                    $timeout(function() {
                        $scope.isSayHi = false;
                    }, 5000);
                });
            });

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

            var camera_preview = document.getElementById('camera-preview');

            addCommand('camera', function() {
                camera_preview.src='http://localhost:8080/?action=stream';
                $scope.focus = 'camera';
            });

            addCommand('camera_take', function() {
                ipcRenderer.send('take-photo');
            });

            addCommand('camera_exit', function() {
                $scope.focus = 'default';
                camera_preview.src='';
            });

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

            addCommand('schedule_show', function() {
               $scope.$apply(function() {
                   $scope.show_schedule = true;
                   console.log("일정이 보여집니다.");
               })
            });

            addCommand('schedule_hide', function() {
                $scope.$apply(function() {
                    $scope.show_schedule = false;
                    console.log("일정이 숨겨집니다.");
                })
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

            addCommand('album_view', function() {
                AlbumService.getAlbum().then(function (response) {
                    $scope.album = response;
                    $scope.focus = 'album';
                }, function(error) {
                    console.log("Error!");
                });
            });

            addCommand('album_prev', function() {
                AlbumService.prevAlbumPage().then(function(response) {
                    $scope.album = response;
                }, function (error) {
                    console.log("Error!");
                });
            });

            addCommand('album_next', function() {
                AlbumService.nextAlbumPage().then(function(response) {
                    $scope.album = response;
                }, function (error) {
                    console.log("Error!");
                });
            });

            $scope.cur_photo = null;

            addCommand('album_detail', function(photo_id) {
                $scope.focus = 'detail_album';
                $scope.cur_photo = $scope.album[photo_id-1];
            });

            addCommand('album_back', function() {
                if($scope.focus === 'detail_album') {
                    $scope.focus = 'album';
                }
            });

            // Check the time
            addCommand('time_show', function(task) {
                 console.debug("It is", moment().format('h:mm:ss a'));
            });
        };
        _this.init();

        socket.on('schedule_removed', function(data) {
           $scope.schedule_list.forEach(function(elem, i){
               console.log("elem.id is", elem.id);

               if(elem.id == data.id) {
                   $scope.schedule_list.splice(i, 1);
                   console.log("FInd!", elem.id);
               }
           });
//           console.log('removed!', data.id);
            console.log("data.id is", data.id);
           $scope.$apply();
        });

        socket.on('schedule_changed', function() {
            $scope.getSchedules();
            $scope.$apply();
        });

//        $scope.notis = [{'type':'com.kakao.talk', 'title':'발신자', 'msg':'aasdfa'},
//            {'type':'com.android.mms', 'title':'010-3353-5858', 'msg':'asdadfasfasdfkljjkaasdfklafsdjkfadsklfalkldfjkladfkjlsdf'},
//            {'type':'com.android.server.telecom', 'title':'발신', 'msg':'가나다라마바사아자차타카파하가나다라마바사아자차타카파하'}];

        $scope.notis = [];


        socket.on('rmnoti', function(type) {
            $scope.$apply(function() {
                for(var i = $scope.notis.length-1; i >= 0; i--) {
                    if ($scope.notis[i].type == type) {
                        $scope.notis.splice(i, 1);
                    }
                }
            });
        });

        socket.on('newnoti', function(data) {
            $scope.$apply(function() {
                $scope.notis.push(data);
            });
        });

        $scope.stream = true;

        ipcRenderer.on('take-photo-complete', function(event, arg) {
            console.log("사진 촬영 명령어 완료", arg);
            $scope.stream = false;
            $scope.photo_snapshot = arg;
            $scope.$apply();
            setTimeout(function() {
                $scope.stream = true;
                $scope.$apply();
            }, 6000);
        });
    }

    angular.module('SmartMirror')
        .controller('MirrorCtrl', MirrorCtrl);

}(window.angular));
