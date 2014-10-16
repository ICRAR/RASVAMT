#!/bin/bash
# Copyright (C) 2014  Cameron Poole 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>

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
UPDATEFLAG=''
RUNDIR=src
LOGS=logs
RUNTESTS=''
TESTDIR=testing
USER=rasvamt
IDENTKEY="RASVAMT.pem"
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
                        echo "-i, identity key          	Uses specified identity key"
                        echo "-H, use particular host   	Performs actions on host"
                        echo "-u, change user    	        Changes user from rasvamt"
                        echo "-T load testing              Load test specific host with locust"
                        echo "-U, Update deployment           Performs update on deployed app"
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
                -U)
                        shift
                        echo "Attempting update"
                        UPDATEFLAG=1
                        ;;
                -T)
                        shift
                        echo "Running locust"
                        RUNTESTS=1
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
    echo "Deploying local install check 127.0.0.1:5000 in browser"
    cd $RUNDIR
	python main.py -l
elif [ $SSHFLAG ]
then
	cd $RUNDIR
    if [ ! -f $IDENTKEY ]; then
        echo "No identity key what ???? "
        exit 1
    fi
	echo "Using identity key $IDENTKEY and HOST=$HOST"
	ssh -i $IDENTKEY $USER@$HOST
elif [ $UPDATEFLAG ]
then
    cd $RUNDIR
    if [ ! -f $IDENTKEY ]; then
        echo "No identity key what ???? "
        exit 1
    fi
    echo "Using identity key $IDENTKEY and HOST=$HOST"
    fab update -i $IDENTKEY -H $HOST -u 'ec2-user'
elif [ $RUNTESTS ]
then
    cd $TESTDIR
    locust -H "http://$HOST"
else
    cd $RUNDIR
	fab test_deploy
fi

