i.	People involved
Leon Drygala: Project Manager, in charge of project organisation
Joseph Dunne: Front-end Developer
Cameron Poole: Back-end Developer
Tan Yu Hwang Aaron: Testing
Justin Venkitachalam: Testing

ii.	How source directory is organized
List of directories,purpose and important files in  each:
top dir: Top directory containing all folders
-RASVAMA.sh : wrapper script for running commands

src: Contains program for running our tool
-fabfile.py: Contains script for connecting and creating ec2 instance and updating our instance
-gunicorn_start: Starts the application on cloud deployment
-flask_test.py: Unit tests flask application
-liveserver_flask.py: Tests if application is deployed

doc: Contains user documentation
-INSTALL.txt: Directions for deployment 

logs: Logging folder for storing logs mainly for debugging purposes
-hosts_file: This lists all hosts that you have deployed application on

testing: Scripts for testing our tool
-automated_front.py: Runs selenium tests

scripts: Useful scripts for doing stuff

db: Database folder stores db

iii.	How user go about running the application
Please see install.txt
Once installed can reconnect if Fabric is install.
User should keep track of host they want to connect to.

To update a host user can run 
RASVAMA.sh -U (runs update with last deployed host)
or
(Other operations can performed in the src directory using)

fab [(operation)|update|deploy] -i identity_file -H host 

To get a full list of all operations run 
fab -l

Or else can ssh into ec2 instance
ssh -i identity_file  user@host
