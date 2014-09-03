"""
Fabric file for installing application portal servers

Test deployment on EC2 is simple as it only runs on one server
fab test_deploy

The tasks can be used individually and thus allow installations in very
diverse situations.

For a full deployment use the command

fab --set postfix=False -f machine-setup/deploy.py test_deploy

For a local installation under a normal user without sudo access

fab -u `whoami` -H <IP address> -f machine-setup/deploy.py user_deploy
"""
import glob

import boto
import os
import time

from fabric.api import run, sudo, put, env, require, local, task
from fabric.context_managers import cd, hide, settings
from fabric.contrib.console import confirm
from fabric.contrib.files import append, sed, comment, exists
from fabric.decorators import task, serial
from fabric.operations import prompt
from fabric.network import ssh
from fabric.utils import puts, abort, fastprint
from fabric.colors import *

#Defaults
#Defaults
thisDir = os.path.dirname(os.path.realpath(__file__))

USERNAME = 'ec2-user'
POSTFIX = False

# The AMI Ids are correct for the US-EAST1 region
AMI_IDs = {'New':'ami-7c807d14', 'CentOS':'ami-aecd60c7', 'SLES':'ami-e8084981'}
# Probably want to change region for us to ap-southeast-2
SYD_AMI_IDs = {'New':'ami-d9fe9be3','CentOS':'ami-5d254067','SLES':'ami-3760040d'}
AMI_ID = AMI_IDs['New']
INSTANCE_NAME = 'RASVAMT'
INSTANCE_TYPE = 't1.micro'
INSTANCES_FILE = os.path.expanduser('~/.aws/aws_instances')

#### This should be replaced by another key and security group
AWS_KEY = os.path.expanduser('~/.ssh/RASVAMT.pem')
KEY_NAME = 'RASVAMT'
#SECURITY_GROUPS = {'RASVAMT':'Allows ssh with RASVAMT'} # Security group allows SSH and other ports
SECURITY_GROUPS = ['RASVAMT']
####
ELASTIC_IP = 'False'
APP_PYTHON_VERSION = '2.7'
APP_PYTHON_URL = 'http://www.python.org/ftp/python/2.7.6/Python-2.7.6.tar.bz2'
USERS = ['rasvamt','cpoole','jdunne']
GROUP = 'rasvamt_user'
APP_DIR = 'rasvamt_portal' # runtime directory
APP_DEF_DB = '/home/rasvamt/DB/rasvamt.sqlite'

#User will have to change and ensure they can pull from git
GITUSER = 'pooli3'
GITREPO = 'github.com/ICRAR/RASVAMT'

#Keep log of process
ssh.util.log_to_file('setup.log',10)

#Check Boto 
BOTO_CONFIG = os.path.expanduser('~/.boto')

YUM_PACKAGES = [
   'autoconf',
   'python27-devel',
   'git',
   'readline-devel',
   'sqlite-devel',
   'make',
   'wget.x86_64',
   'gcc',
   'patch',
   'httpd24',
   'nginx',
]

APT_PACKAGES = [
        'libreadline-dev',
        'sqlite3',
        'libsqlite3-dev',
        'httpd24',
        ]


PIP_PACKAGES = [
                'fabric',
                'boto',
                'flask',
		'gunicorn',
		'pysendfile',
   		'supervisor',
                ]

PUBLIC_KEYS = os.path.expanduser('~/.ssh')
# WEB_HOST = 0
# UPLOAD_HOST = 1
# DOWNLOAD_HOST = 2

@task
def set_env():
    # set environment to default for EC2, if not specified on command line.

    # puts(env)
    if not env.has_key('GITUSER') or not env.GITUSER:
        env.GITUSER = GITUSER
    if not env.has_key('GITREPO') or not env.GITREPO:
        env.GITREPO = GITREPO
    if not env.has_key('postfix') or not env.postfix:
        env.postfix = POSTFIX
    if not env.has_key('user') or not env.user:
        env.user = USERNAME
    if not env.has_key('USERS') or not env.USERS:
        env.USERS = USERS
    if type(env.USERS) == type(''): # if its just a string
        print "USERS preset to {0}".format(env.USERS)
        env.USERS = [env.USERS] # change the type
    if not env.has_key('HOME') or env.HOME[0] == '~' or not env.HOME:
        env.HOME = run("echo ~{0}".format(env.USERS[0]))
    if not env.has_key('src_dir') or not env.src_dir:
        env.src_dir = thisDir + '/../'
    require('hosts', provided_by=[test_env])
    if not env.has_key('HOME') or env.HOME[0] == '~' or not env.HOME:
        env.HOME = run("echo ~{0}".format(USERS[0]))
    if not env.has_key('PREFIX') or env.PREFIX[0] == '~' or not env.PREFIX:
        env.PREFIX = env.HOME
    if not env.has_key('APP_DIR_ABS') or env.APP_DIR_ABS[0] == '~' \
    or not env.APP_DIR_ABS:
        env.APP_DIR_ABS = '{0}/{1}'.format(env.PREFIX, APP_DIR)
        env.APP_DIR = APP_DIR
    else:
        env.APP_DIR = env.APP_DIR_ABS.split('/')[-1]
    if not env.has_key('force') or not env.force:
        env.force = 0
    if not env.has_key('ami_name') or not env.ami_name:
        env.ami_name = 'CentOS'
    env.AMI_ID = AMI_IDs[env.ami_name]
    if env.ami_name == 'SLES':
        env.user = 'root'
    get_linux_flavor()
    puts("""Environment:
            USER:              {0};
            Key file:          {1};
            hosts:             {2};
            host_string:       {3};
            postfix:           {4};
            HOME:              {8};
            APP_DIR_ABS:      {5};
            APP_DIR:          {6};
            USERS:        {7};
            PREFIX:            {9};
            SRC_DIR:           {10};
            """.\
            format(env.user, env.key_filename, env.hosts,
                   env.host_string, env.postfix, env.APP_DIR_ABS,
                   env.APP_DIR, env.USERS, env.HOME, env.PREFIX, 
                   env.src_dir))



@task(alias='setup')
def check_setup():
    """ Check current user has everything required to deploy 

    Includes boto config/aws config 
    Security keys, possibly check permissions
    """
    if not os.path.isfile(BOTO_CONFIG):
	abort('Require boto config to create instance')

@task
def create_instance(names, use_elastic_ip, public_ips):
    """Create the EC2 instance

    :param names: the name to be used for this instance
    :type names: list of strings
    :param boolean use_elastic_ip: is this instance to use an Elastic IP address

    :rtype: string
    :return: The public host name of the AWS instance
    """

    puts('Creating instances {0} [{1}:{2}]'.format(names, use_elastic_ip, public_ips))
    number_instances = len(names)
    if number_instances != len(public_ips):
        abort('The lists do not match in length')

    # This relies on a ~/.boto file holding the '<aws access key>', '<aws secret key>'
    conn = boto.connect_ec2()
    
#    for sec,desc in SECURITY_GROUPS.iteritems():
#	    if sec not in conn.get_all_security_groups():
#		    conn.create_security_group(sec,desc).authorize('tcp', 80, 80, '0.0.0.0/0')

    if use_elastic_ip:
        # Disassociate the public IP
        for public_ip in public_ips:
            if not conn.disassociate_address(public_ip=public_ip):
                abort('Could not disassociate the IP {0}'.format(public_ip))

    reservations = conn.run_instances(AMI_ID, instance_type=INSTANCE_TYPE, key_name=KEY_NAME, security_groups=SECURITY_GROUPS, min_count=number_instances, max_count=number_instances)
    instances = reservations.instances
    # Sleep so Amazon recognizes the new instance
    for i in range(4):
        fastprint('.')
        time.sleep(5)

    # Are we running yet?
    for i in range(number_instances):
        while not instances[i].update() == 'running':
            fastprint('.')
            time.sleep(5)

    # Sleep a bit more Amazon recognizes the new instance
    for i in range(4):
        fastprint('.')
        time.sleep(5)
    puts('.')

    # Tag the instance
    for i in range(number_instances):
        conn.create_tags([instances[i].id], {'Name': names[i]})

    # Associate the IP if needed
    if use_elastic_ip:
        for i in range(number_instances):
            puts('Current DNS name is {0}. About to associate the Elastic IP'.format(instances[i].dns_name))
            if not conn.associate_address(instance_id=instances[i].id, public_ip=public_ips[i]):
                abort('Could not associate the IP {0} to the instance {1}'.format(public_ips[i], instances[i].id))

    # Give AWS time to switch everything over
    time.sleep(10)

    # Load the new instance data as the dns_name may have changed
    host_names = []
    for i in range(number_instances):
        instances[i].update(True)
        puts('Current DNS name is {0} after associating the Elastic IP'.format(instances[i].dns_name))
        host_names.append(str(instances[i].dns_name))


    # The instance is started, but not useable (yet)
    puts('Started the instance(s) now waiting for the SSH daemon to start.')
    for i in range(12):
        fastprint('.')
        time.sleep(5)
    puts('.')

    return host_names

@task
def get_linux_flavor():
    """
    Obtain and set the env variable linux_flavor
    """
    if (check_path('/etc/issue')):
        re = run('cat /etc/issue')
        linux_flavor = re.split()
        if (len(linux_flavor) > 0):
            if linux_flavor[0] == 'CentOS' or linux_flavor[0] == 'Ubuntu' \
               or linux_flavor[0] == 'Debian':
                linux_flavor = linux_flavor[0]
            elif linux_flavor[0] == 'Amazon':
                linux_flavor = ' '.join(linux_flavor[:2])
            elif linux_flavor[2] == 'SUSE':
                linux_flavor = linux_flavor[2]
    else:
        linux_flavor = run('uname -s')

    print "Remote machine running %s" % linux_flavor
    env.linux_flavor = linux_flavor
    return linux_flavor



def to_boolean(choice, default=False):
    """Convert the yes/no to true/false

    :param choice: the text string input
    :type choice: string
    """
    valid = {"yes":True,   "y":True,  "ye":True,
             "no":False,     "n":False}
    choice_lower = choice.lower()
    if choice_lower in valid:
        return valid[choice_lower]
    return default

def check_command(command):
    """
    Check existence of command remotely

    INPUT:
    command:  string

    OUTPUT:
    Boolean
    """
    res = run('if command -v {0} &> /dev/null ;then command -v {0};else echo ;fi'.format(command))
    return res

def check_dir(directory):
    """
    Check existence of remote directory
    """
    res = run('if [ -d {0} ]; then echo 1; else echo ; fi'.format(directory))
    return res


def check_path(path):
    """
    Check existence of remote path
    """
    res = run('if [ -e {0} ]; then echo 1; else echo ; fi'.format(path))
    return res


def check_python():
    """
    Check for the existence of correct version of python

    INPUT:
    None

    OUTPUT:
    path to python binary    string, could be empty string
    """
    # Try whether there is already a local python installation for this user
    ppath = os.path.realpath(env.APP_DIR_ABS+'/../python')
    ppath = check_command('{0}/bin/python{1}'.format(ppath, APP_PYTHON_VERSION))
    if ppath:
        return ppath
    # Try python2.7 first
    ppath = check_command('python{0}'.format(APP_PYTHON_VERSION))
    if ppath:
        env.PYTHON = ppath
        return ppath


def install_yum(package):
    """
    Install a package using YUM
    """
    errmsg = sudo('yum --assumeyes --quiet install {0}'.format(package),\
                   combine_stderr=True, warn_only=True)
    processCentOSErrMsg(errmsg)


def install_apt(package):
    """
    Install a package using APT

    NOTE: This requires sudo access
    """
    sudo('apt-get -qq -y install {0}'.format(package))


def check_yum(package):
    """
    Check whether package is installed or not

    NOTE: requires sudo access to machine
    """
    with hide('stdout','running','stderr'):
        res = sudo('yum --assumeyes --quiet list installed {0}'.format(package), \
             combine_stderr=True, warn_only=True)
    #print res
    if res.find(package) > 0:
        print "Installed package {0}".format(package)
        return True
    else:
        print "NOT installed package {0}".format(package)
        return False


def check_apt(package):
    """
    Check whether package is installed using APT

    NOTE: This requires sudo access
    """
    # TODO
    with hide('stdout','running'):
        res = sudo('dpkg -L | grep {0}'.format(package))
    if res.find(package) > -1:
        print "Installed package {0}".format(package)
        return True
    else:
        print "NOT installed package {0}".format(package)
        return False


def copy_public_keys():
    """
    Copy the public keys to the remote servers
    """
    env.list_of_users = []
    for file in glob.glob(PUBLIC_KEYS + '/*.pub'):
        filename = '.ssh/{0}'.format(os.path.basename(file))
        user, ext = os.path.splitext(filename)
        env.list_of_users.append(user)
        put(file, filename)


def virtualenv(command):
    """
    Just a helper function to execute commands in the virtualenv
    """
    env.activate = 'source {0}/bin/activate'.format(env.APP_DIR_ABS)
    with cd(env.APP_DIR_ABS):
        run(env.activate + '&&' + command)

@task
def git_clone():
    """
    Clones the repository.
    """
    print(green("Cloning from GitHub..."))
    copy_public_keys()
    with cd(env.APP_DIR_ABS):
	try:
	    sudo('git clone https://{1}.git'.format(env.GITUSER, env.GITREPO))
	except:
	    gituser = raw_input("Enter git user name")
	    sudo('git clone https://{1}.git'.format(gituser,env.GITREPO))

    print(green("Clone complete"))

@task
def git_pull():
    """
    Update repo
    """
    copy_public_keys()
    with cd(env.APP_DIR_ABS+'/RASVAMT'):
	sudo('git pull')

@task
def git_clone_tar():
    """
    Clones the repository into /tmp and packs it into a tar file

    TODO: This does not work outside iVEC. The current implementation
    is thus using a tar-file, copied over from the calling machine.
    """
    set_env()
    with cd('/tmp'):
        local('cd /tmp && git clone {0}@{1}'.format(env.GITUSER, env.GITREPO))
        local('cd /tmp && tar -cjf {0}.tar.bz2 {0}'.format(APP_DIR))
        tarfile = '{0}.tar.bz2'.format(APP_DIR)
        put('/tmp/{0}'.format(tarfile), tarfile)
        local('rm -rf /tmp/{0}'.format(APP_DIR))  # cleanup local git clone dir
        run('tar -xjf {0} && rm {0}'.format(tarfile))


def processCentOSErrMsg(errmsg):
    if (errmsg == None or len(errmsg) == 0):
        return
    if (errmsg == 'Error: Nothing to do'):
        return
    firstKey = errmsg.split()[0]
    if (firstKey == 'Error:'):
        abort(errmsg)


@task
def system_install():
    """
    Perform the system installation part.

    NOTE: Most of this requires sudo access on the machine(s)
    """
    set_env()

    # Install required packages
    re = run('cat /etc/issue')
    linux_flavor = re.split()
    if (len(linux_flavor) > 0):
        if linux_flavor[0] == 'CentOS':
            linux_flavor = linux_flavor[0]
        elif linux_flavor[0] == 'Amazon':
            linux_flavor = ' '.join(linux_flavor[:2])
    if (linux_flavor in ['CentOS','Amazon Linux']):
        # Update the machine completely
        errmsg = sudo('yum --assumeyes --quiet update', combine_stderr=True, warn_only=True)
        processCentOSErrMsg(errmsg)
        for package in YUM_PACKAGES:
            install_yum(package)

    elif (linux_flavor == 'Ubuntu'):
        for package in APT_PACKAGES:
            install_apt(package)
    else:
        abort("Unknown linux flavor detected: {0}".format(re))


@task
def system_check():
    """
    Check for existence of system level packages

    NOTE: This requires sudo access on the machine(s)
    """
    with hide('running','stderr','stdout'):
        set_env()

        re = run('cat /etc/issue')
    linux_flavor = re.split()
    if (len(linux_flavor) > 0):
        if linux_flavor[0] == 'CentOS':
            linux_flavor = linux_flavor[0]
        elif linux_flavor[0] == 'Amazon':
            linux_flavor = ' '.join(linux_flavor[:2])

    summary = True
    if (linux_flavor in ['CentOS','Amazon Linux']):
        for package in YUM_PACKAGES:
            if not check_yum(package):
                summary = False
    elif (linux_flavor == 'Ubuntu'):
        for package in APT_PACKAGES:
            if not check_apt(package):
                summary = False
    else:
        abort("Unknown linux flavor detected: {0}".format(re))
    if summary:
        print "\n\nAll required packages are installed."
    else:
        print "\n\nAt least one package is missing!"


@task
def postfix_config():
    """
    Setup the e-mail system for
    notifications. It requires access to an SMTP server.
    """

    if 'gmail_account' not in env:
        prompt('GMail Account:', 'gmail_account')
    if 'gmail_password' not in env:
        prompt('GMail Password:', 'gmail_password')

    # Setup postfix
    sudo('service sendmail stop')
    sudo('service postfix stop')
    sudo('chkconfig sendmail off')
    sudo('chkconfig sendmail --del')

    sudo('chkconfig postfix --add')
    sudo('chkconfig postfix on')

    sudo('service postfix start')

    sudo('''echo "relayhost = [smtp.gmail.com]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_CAfile = /etc/postfix/cacert.pem
smtp_use_tls = yes

# smtp_generic_maps
smtp_generic_maps = hash:/etc/postfix/generic
default_destination_concurrency_limit = 1" >> /etc/postfix/main.cf''')

    sudo('echo "[smtp.gmail.com]:587 {0}@gmail.com:{1}" > /etc/postfix/sasl_passwd'.format(env.gmail_account, env.gmail_password))
    sudo('chmod 400 /etc/postfix/sasl_passwd')
    sudo('postmap /etc/postfix/sasl_passwd')


@task
def user_setup():
    """
    setup rasvamt users.

    TODO: sort out the ssh keys
    """

    set_env()
    if not env.user:
        env.user = USERNAME # defaults to ec2-user
    sudo('groupadd {0}'.format(GROUP), warn_only=True)
    for user in env.USERS:
        sudo('useradd -g {0} -m -s /bin/bash {1}'.format(GROUP, user), warn_only=True)
        sudo('mkdir /home/{0}/.ssh'.format(user), warn_only=True)
        sudo('chmod 700 /home/{0}/.ssh'.format(user))
        sudo('chown -R {0}:{1} /home/{0}/.ssh'.format(user,GROUP))
        home = run('echo $HOME')
        sudo('cp {0}/.ssh/authorized_keys /home/{1}/.ssh/authorized_keys'.format(home, user))
        sudo('chmod 600 /home/{0}/.ssh/authorized_keys'.format(user))
        sudo('chown {0}:{1} /home/{0}/.ssh/authorized_keys'.format(user, GROUP))
	#change to allow group permissions to acces home
        #sudo('chmod 770 /home/{0}/'.format(user))
        
    # create RASVAMT directories and chown to correct user and group
    sudo('mkdir -p {0}'.format(env.APP_DIR_ABS))
    sudo('chown {0}:{1} {2}'.format(env.USERS[0], GROUP, env.APP_DIR_ABS))
    sudo('mkdir -p {0}/../RASVAMT'.format(env.APP_DIR_ABS))
    sudo('chown {0}:{1} {2}/../RASVAMT'.format(env.USERS[0], GROUP, env.APP_DIR_ABS))
    sudo('usermod -a -G {} ec2-user'.format(GROUP))
    print "\n\n******** USER SETUP COMPLETED!********\n\n"


@task
def python_setup():
    """
    Ensure that there is the right version of python available
    If not install it from scratch in user directory.

    INPUT:
    None

    OUTPUT:
    None
    """
    set_env()

    with cd('/tmp'):
        run('wget --no-check-certificate -q {0}'.format(APP_PYTHON_URL))
        base = os.path.basename(APP_PYTHON_URL)
        pdir = os.path.splitext(os.path.splitext(base)[0])[0]
        run('tar -xjf {0}'.format(base))
    ppath = run('echo $PWD') + '/python'
    with cd('/tmp/{0}'.format(pdir)):
        run('./configure --prefix {0};make;make install'.format(ppath))
        ppath = '{0}/bin/python{1}'.format(ppath,APP_PYTHON_VERSION)
    env.PYTHON = ppath
    print "\n\n******** PYTHON SETUP COMPLETED!********\n\n"


@task
def virtualenv_setup():
    """
    setup virtualenv with the detected or newly installed python
    """
    set_env()
    check_python()
    print "CHECK_DIR: {0}/src".format(check_dir(env.APP_DIR_ABS))
    if check_dir(env.APP_DIR_ABS+'/src'):
        abort('{0}/src directory exists already'.format(env.APP_DIR_ABS))

    with cd('/tmp'):
        run('wget https://pypi.python.org/packages/source/v/virtualenv/virtualenv-1.11.tar.gz')
        run('tar -xzf virtualenv-1.11.tar.gz')
        with settings(user=env.USERS[0]):
            run('cd virtualenv-1.11; {0} virtualenv.py {1}'.format(env.PYTHON, env.APP_DIR_ABS))
    print "\n\n******** VIRTUALENV SETUP COMPLETED!********\n\n"

@task
def package_install(all=True,package=''):
    """
    Install required python packages.
    """
    if all:
	for p in PIP_PACKAGES:
	    virtualenv('pip install {}'.format(p))
    else:
	virtualenv('pip install {}'.format(package))

@task
def new_package(package):
    set_env()
    package_install(all=False,package=package)


@task
@serial
def test_env():
    """Configure the test environment on EC2

    Ask a series of questions before deploying to the cloud.

    Allow the user to select if a Elastic IP address is to be used
    """
    if not env.has_key('instance_name') or not env.instance_name:
        env.instance_name = INSTANCE_NAME
    if not env.has_key('use_elastic_ip') or not env.use_elastic_ip:
        env.use_elastic_ip = ELASTIC_IP
    if not env.has_key('key_filename') or not env.key_filename:
        env.key_filename = AWS_KEY
    if not env.has_key('ami_name') or not env.ami_name:
        env.ami_name = 'CentOS'
    env.AMI_ID = AMI_IDs[env.ami_name]
    env.instance_name = INSTANCE_NAME
    env.use_elastic_ip = ELASTIC_IP
    if 'use_elastic_ip' in env:
        use_elastic_ip = to_boolean(env.use_elastic_ip)
    else:
        use_elastic_ip = confirm('Do you want to assign an Elastic IP to this instance: ', False)

    public_ip = None
    if use_elastic_ip:
        if 'public_ip' in env:
            public_ip = env.public_ip
        else:
            public_ip = prompt('What is the public IP address: ', 'public_ip')

    if 'instance_name' not in env:
        prompt('AWS Instance name: ', 'instance_name')

    # Create the instance in AWS
    host_names = create_instance([env.instance_name], use_elastic_ip, [public_ip])
    env.hosts = host_names
    if not env.host_string:
        env.host_string = env.hosts[0]
    env.user = USERNAME
    if env.ami_name == 'SLES':
        env.user = 'root'

    env.key_filename = AWS_KEY
    env.roledefs = {
        'rasvamtmgr' : host_names,
        'rasvamt' : host_names,
    }
    print "\n\n******** EC2 ENVIRONMENT SETUP!********\n\n"


@task
def user_deploy():
    """
    Deploy the system as a normal user without sudo access
    """
    env.hosts = ['localhost',]
    set_env()
    ppath = check_python()
    if not ppath:
        python_setup()
    else:
        env.PYTHON = ppath
    virtualenv_setup()
    package_install()


@task
def init_deploy():
    """
    Install the init script for an operational deployment
    Requires user with sudo access 
    """
    #TODO:Sort out ec2-user into rasvamt group ? 
    if not env.has_key('APP_DIR_ABS') or not env.APP_DIR_ABS:
        env.APP_DIR_ABS = '{0}/{1}/'.format('/home/rasvamt', APP_DIR)
    
    #check if git repo exists pull else clone
    print(red("Initialising deployment"))
    set_env()
    if check_dir(env.APP_DIR_ABS+'/RASVAMT'):
	git_pull()
    else:
	git_clone()
    
    sudo('mkdir /etc/supervisor/')
    #Having trouble with 
    with cd(env.APP_DIR_ABS+'/RASVAMT'):
	sudo('cp nginx.conf /etc/nginx/')
    	sudo('cp conf.d /etc/supervisor/')
    	sudo('chmod +x gunicorn_start')

    #check if nginx is running else
    sudo('service nginx start')
    print(red("Server setup and ready to deploy"))
    #Think we have 

@task(alias='run')
def deploy():
    """Runs deployment"""
    print(red("Beginning Deploy:"))
    #might need setenv 
    print(blue("Deploy finished check server {}".format(env.host_string)))


@task(alias='update')
def update_deploy():
	"""
	Stop app running
	Update git repository and db etc
	TODO: maybe use zc.buildout
	"""
	set_env()
	#sudo(virtualenv('supervisorctl restart RASVAMT'))
	git_pull()
    	with cd(env.APP_DIR_ABS+'/RASVAMT'):
	    sudo('cp nginx.conf /etc/nginx/')
	    sudo('cp conf.d /etc/supervisor/')
    	sudo('service nginx reload')

@task
@serial
def operations_deploy():
    """
    ** MAIN TASK **: Deploy the full operational environment.
    In order to install on an operational host go to any host
    where the application is already running or where you have git-cloned the
    software and issue the command:

    fab -u <super-user> -H <host> operations_deploy

    where <super-user> is a user on the target machine with root priviledges
    and <host> is either the DNS resolvable name of the target machine or
    its IP address.
    """

    if not env.user:
        env.user = 'root'
    # set environment to default, if not specified otherwise.
    set_env()
    system_install()
    if env.postfix:
        postfix_config()
    user_setup()
    with settings(user=USERS[0]):
        ppath = check_python()
        if not ppath:
            python_setup()
        virtualenv_setup()
        package_install()
    init_deploy()

@task
def install(standalone=0):
    """
    Install RASVAMT users and RASVAMT software on existing machine.
    Note: Requires root permissions!
    """
    set_env()
    user_setup()
    print(green("Setting up python path"))
    print("Users {}".format(env.USERS))
    with settings(user=env.USERS[0]):
        ppath = check_python()
        if not ppath:
            python_setup()
    print(green("Setting up home directory might require chmod"))
    if env.PREFIX != env.HOME: # generate non-standard directory
        sudo('mkdir -p {0}'.format(env.PREFIX))
        sudo('chown -R {0}:{1} {2}'.format(env.USERS[0], GROUP, env.PREFIX))
    print(green("Setting up virtual env"))
    with settings(user=env.USERS[0]):
        virtualenv_setup()
    	print(green("Installing python packages"))
    	package_install()
        # more installation goes here
    print(red("\n\n******** INSTALLATION COMPLETED!********\n\n"))

@task
def uninstall():
    """
    Uninstall RASVAMT, RASVAMT users and init script.
    
    NOTE: This can only be used with a sudo user.
    """
    set_env()
    for u in env.USERS:
        sudo('userdel -r {0}'.format(u), warn_only=True)
    sudo('groupdel {0}'.format(GROUP), warn_only=True)
    sudo('rm -rf {0}'.format(env.PREFIX), warn_only=True)
    sudo('rm -rf {0}'.format(env.APP_DIR_ABS), warn_only=True)
    print "\n\n******** UNINSTALL COMPLETED!********\n\n"

@task
@serial
def test_deploy():
    """
    ** MAIN TASK **: Deploy the full application EC2 test environment.
    """

    test_env()
    # set environment to default for EC2, if not specified otherwise.
    set_env()
    system_install()
    if env.postfix:
        postfix_config()
    install()
    init_deploy()
    deploy()


@task
def test_server():
	"""
	Tests if server is up and running
	"""
	pass

@task
def test_db():
	"""
	Tests if database is working
	"""
	pass
@task
def test_flask_app():
	"""
	Runs flask tests
	"""
	pass
@task
def test_front_end():
	"""
	Runs automated front end testing
	"""
	pass

@task(alias='test')
def test_all():
	"""
	Run all tests for given host
	"""
	check_setup()
	test_db()
	test_flask_app()
	test_front_end()

@task
def uninstall_user():
    """
    Uninstall application, users and init script.
    """
    set_env()
    if env.user in ['ec2-user', 'root']:
        for u in env.USERS:
            sudo('userdel -r {0}'.format(u), warn_only=True)
#            sudo('rm /etc/init.d/ngamsServer', warn_only=True)
    else:
        run('rm -rf {0}'.format(env.APP_DIR_ABS))
