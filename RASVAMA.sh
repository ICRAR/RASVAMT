#!/bin/bash
# This script it just a wrapper to help n00bs and lazy peeps like myself 
# with deploying RASVAMA locally or connecting to an ec2-instance
# Running the standard script will deploy to ec2 assuming everything is set up correctly
# This uses the usual fabric stuff
# If called with -l will run local instance
# Makes -ssh slightly less tedious not really sure what is going on with identity file 
# and why it must always be supplied
# Cameron October 2014
LOCALFLAG=''
SSHFLAG=''
RUNDIR=src
LOGS=logs
USER=rasvamt
IDENTKEY=$RUNDIR/RASVAMT.pem
declare -a HOSTS


while test $# -gt 0; do
        case "$1" in
                -h|--help)
                        echo "$0 -  Wrapper script to help RASVAMA deployment"
                        echo " "
                        echo "$0 [options] [arguments]"
                        echo " "
                        echo "options:"
                        echo "-h, --help                	show brief help"
                        echo "-l, local deployment      	Run local deployment"
                        echo "-s, ssh in deployed       	SSH into deployed server"
                        echo "-i, identity key          	USES specified identity key"
                        echo "-H, use particular host   	Performs actions on host"
                        echo "-u, change user    	        Changes user from rasvamt"
                        exit 0
                        ;;
                -l)
					shift
					LOCALFLAG=1
                    ;;
                -H)
                        shift
                        if test $# -gt 0; then
                                export HOST=$1
                        else
                                echo "no host specified"
                                exit 1
                        fi
                        shift
                        ;;
                --action*)
                        export PROCESS=`echo $1 | sed -e 's/^[^=]*=//g'`
                        shift
                        ;;
                -i)
                        shift
                        if test $# -gt 0; then
                                export IDENTKEY=$1
                        else
                                echo "no output dir specified"
                                exit 1
                        fi
                        shift
                        ;;
                -u)
                        shift
                        if test $# -gt 0; then
                                export USER=$1
                        else
                                echo "no output dir specified"
                                exit 1
                        fi
                        shift
                        ;;
                -s)
						shift
						echo "Attempting SSH"
						SSHFLAG=1
						;;
                *)
                        break
                        ;;
        esac
done

#Go through hosts_files and get last host usually the one we want
let i=0
while read line_data; do
    HOSTS[i]="${line_data}"
    ((++i))
done < $LOGS/hosts_file
#just going to set host to last in array
HOST=${HOSTS[$(($i-1))]}

if [ $LOCALFLAG ]
then 
    #Automatically uncomment and run local version
    echo "Deploying local install check 127.0.0.1:5000 in browser"
    if [ ! -f locallock ]
    then
    sed 's/#app.run()/app.run/' src/main.py > tmp1
	#comment line that usually runs
	yes | sed 's/app.run(host/#&/' tmp1 > $RUNDIR/main.py
    touch locallock
    fi
    cd $RUNDIR
	python main.py
elif [ $SSHFLAG ]
then
	cd $RUNDIR
	echo "Using identity key $IDENTKEY and HOST=$HOST"
	ssh -i $IDENTKEY $USER@$HOST
else
    echo "Creating new deployment"
	if [ -f locallock ]
    then
	sed 's/[^#]app.run()/ #app.run()/' src/main.py > tmp1
	yes | sed 's/\(#\)\(app.run(host\)/\2/' tmp1 > $RUNDIR/main.py
    rm locallock
    fi
    cd $RUNDIR
	fab test_deploy
fi

