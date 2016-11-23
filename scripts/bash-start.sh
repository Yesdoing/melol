#!/bin/bash
export DISPLAY=:0
export XAUTHORITY=/home/pi/.Xauthority
. /home/pi/auto-start.sh
cd /home/pi/smart-mirror && npm start