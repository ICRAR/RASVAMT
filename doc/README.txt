i.	RASVAMT

RASVAMT stands for Radio Astronomy Survey Visualisation and Monitoring Tool. This is a project set-out to 
implement a tool specialised to support the planning and monitoring of the execution and reduction of large-scale,
or all-sky surveys for Radio Astronomy. The idea is to implement this along the same ideas as the SVMT plugin for 
Stellarium, but very much aligned to the needs of Radio Astronomy. Primarily the project has been created as an
educational software development project for computer science students, but the intention is to arrive at a fully 
working product by following an agile development model.

ii.	People involved

Leon Drygala         : Project Manager, in charge of project organisation
Joseph Dunne         : Front-end Developer
Cameron Poole        : Back-end Developer
Tan Yu Hwang Aaron   : Testing
Justin Venkitachalam : Testing


iii.	Source directory

top directory   	 	: Top directory containing all folders
	-RASVAMA.sh 	 	: Wrapper script for running commands

src 				 	: Contains program for running our tool
	-fabfile.py		 	: Contains script for connecting and creating and updating an ec2 instance
	-gunicorn_start	 	: Starts the application on cloud deployment
	-flask_test.py	 	: Unit tests flask application
	-liveserver_flask.py: Tests if application is deployed

doc 					: Contains user documentation
	-INSTALL.txt		: Directions for deployment 

logs 					: Logging folder for storing logs mainly for debugging purposes
	-hosts_file			: This lists all hosts that you have deployed application on

testing 				: Scripts for testing our tool
	-automated_front.py	: Runs selenium tests

scripts 				: Useful scripts for doing stuff
	-createSampleData.py: Creates Sample data 

db 						: Database folder stores db
	-create_db.py		: Creates main database for application


iv.	How to run the application

To run, double click gunicorn_start.
For installation instructions, refer to install.txt.
Connection to host can be reconnected as long as Fabric is installed.

To effect a host, run:
fab [(operation)|update|deploy] -i identity_file -H host 

To get a full list of all operations run:
fab -l

Or else can ssh into ec2 instance
ssh -i identity_file  user@host
