#!/usr/bin/bash
#May need to enable chmod +x this script
#TODO: add the above to README.txt
#Finish off non local install to check if local install has occered
set localinstall = 0;
if [[ $# = 2 ]]; then 
	#Check if -l flag
	#Set localinstall = 1
fi

if [[ $localinstall ]]; then
	#sed edit line in main.py an uncomment line that has #app.run
	sed 's/#app.run/app.run/' src/main.py > tmp1
	#comment line that usually runs
	yes | sed 's/app.run\(0\.0/#&/' src/tmp > main.py
else;
	#do opposited of this

