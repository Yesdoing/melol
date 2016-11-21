(function() {
    'use strict';

    function AudioService($http, $rootScope) {
        var service = {};

        var music_list = [];
        var current_music_idx;
        var audio = new Audio(),
            audiosource = new AudioSource(audio);

        service.scResponse = null;

        service.init = function() {
            $http({
                'method':'GET',
                'url':config.SERVER_URL+'/api/music'
            }).success(function(response) {
                music_list = response.result;
                music_list.forEach(function(elem) {
                   elem.filename = elem.file.match(/[^\\/]+$/)[0];
                });
                console.log("music list is", music_list);
                current_music_idx = 0;
                service.playMusic();
            }).error(function(response) {
                console.log("Failed Music", response);
            });
        };

        service.loadMusic = function() {
            audio.src = config.SERVER_URL + '/api/music?cursor='+music_list[current_music_idx].priority;
            $rootScope.currentMusic = music_list[current_music_idx].filename;
            audio.load();
            audio.play();
//            setInterval(function(){ audiosource.draw() }, 30);
        };

        service.playMusic = function() {
            service.loadMusic();
        };

        service.prevMusic = function() {
            current_music_idx = current_music_idx <= 0 ? music_list.length-1 : current_music_idx-1;
            service.loadMusic();
        };

        service.nextMusic = function() {
            current_music_idx = current_music_idx >= music_list.length-1 ? 0 : current_music_idx+1;
            service.loadMusic();
        };

        service.stopMusic = function() {
            audio.pause();
        };

        service.resumeMusic = function() {
            audio.play();
        };

        service.exitMusic = function() {
            audio.pause();
            audio.currnetTime = 0;
        };

        audio.addEventListener("ended", function() {
            console.log("노래가 끝났다.");
            service.nextMusic();
        });

        return service;
    }

    var AudioSource = function(audio){
        var self = this;
        var audioCtx = new (window.AudioContext || window.webkitAudioContext);
        var source = audioCtx.createMediaElementSource(audio);

        var analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        audio.crossOrigin = "anonymous";
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        this.bufferLength = analyser.frequencyBinCount;

        this.dataArray = new Uint8Array(this.bufferLength);

        this.draw = function() {
            analyser.getByteTimeDomainData(this.dataArray);
            drawCanvas(this.dataArray,this.bufferLength);
        };

    };

    function drawCanvas(dataArray,bufferLength){
        var canvas = document.getElementById('visualizer');
        var canvasCtx = canvas.getContext("2d");

        var WIDTH = 500;
        var HEIGHT = 150;

        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        canvasCtx.strokeStyle = 'tomato';

        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();

        var sliceWidth = WIDTH * 1.0 / bufferLength;
        var x = 0;

        for(var i = 0; i < bufferLength; i++) {
            var data = dataArray[i];
            var v = data / 128.0;
            var y = v * HEIGHT/2;

            if(i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }
        canvasCtx.lineTo(canvas.width, canvas.height/2);
        canvasCtx.stroke();
    }

    angular.module('SmartMirror')
        .factory('AudioService', AudioService);

}());
