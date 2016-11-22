#!/bin/bash
export DISPLAY=:0
export XAUTHORITY=/home/pi/.Xauthority
cd /home/pi/smart-mirror && npm start
cd /home/pi/Zolzack/picam-streamer && sh mjpg.sh