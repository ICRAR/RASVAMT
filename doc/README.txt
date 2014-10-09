i.	People involved
Leon Drygala: Project Manager, in charge of project organisation
Joseph Dunne: Front-end Developer
Cameron Poole: Back-end Developer
Tan Yu Hwang Aaron: Testing
Justin Venkitachalam: Testing

ii.	How source directory is organized
List of directories,purpose and important files in  each:

src: Contains program for running our tool
fabfile.py: Contains script for connecting and creating ec2 instance and updating our instance
gunicorn_start: Starts the application

doc: Contains user documentation
logs: Logging folder for storing logs mainly for debugging purposes
hosts_file: This lists all hosts that you have deployed application on
testing: Scripts for testing our tool
scripts: Useful scripts for doing stuff
db: Database folder stores db

iii.	How user go about running the application
Please see install.txt
Once installed can reconnect if Fabric is install.
User should keep track of host they want to connect to.
To effect a host user can run 
fab [(operation)|update|deploy] -i identity_file -H host 

To get a full list of all operations run 
fab -l

Or else can ssh into ec2 instance
ssh -i identity_file  user@host
