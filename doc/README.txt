i.	People involved

Leon Drygala         : Project Manager, in charge of project organisation
Joseph Dunne         : Front-end Developer
Cameron Poole        : Back-end Developer
Tan Yu Hwang Aaron   : Testing
Justin Venkitachalam : Testing


ii.	Source directory

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


iii.	How to run the application

To run, double click gunicorn_start.
For installation instructions, refer to install.txt.
Connection to host can be reconnected as long as Fabric is installed.

To effect a host, run:
fab [(operation)|update|deploy] -i identity_file -H host 

To get a full list of all operations run:
fab -l

Or else can ssh into ec2 instance
ssh -i identity_file  user@host
