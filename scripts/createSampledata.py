import json
import random
import time

SRCDIR = '../src/'
SURVEYNAMES = ['WALLABY','DINGO_A','DINGO_B','DINGO_C']
TESTDATA = 'static/WallabyObs.json'
OUTFILE = 'static/{Survey}Test.json'
STATUS = ['PLANNED','OBSERVED', 'QUALITY CONTROL','PROCESSED']
STARTDATE = "1/1/2011 12:00 AM"
ENDDATE = "31/12/2013 11:00 PM"


def strTimeProp(start, end, format, prop):
    """Get a time at a proportion of a range of two formatted times.
 
    start and end should be strings specifying times formated in the
    given format (strftime-style), giving an interval [start, end].
    prop specifies how a proportion of the interval to be taken after
    start.  The returned time will be in the specified format.
    """

    stime = time.mktime(time.strptime(start, format))
    etime = time.mktime(time.strptime(end, format))

    ptime = stime + prop * (etime - stime)

    return time.strftime(format, time.localtime(ptime))


def randomDate(start, end, prop):
    return strTimeProp(start, end, '%d/%m/%Y %I:%M %p', prop)

def main():
	with open(SRCDIR+TESTDATA,'r') as jsonfile:
		transform_data = json.load(jsonfile)
	#Maybe we can change some of the survey coordinates
	for sbdata in transform_data:
		survey_name = random.choice(SURVEYNAMES)
		sbdata['project'] = survey_name
		sbdata['ESO']['programID'] = survey_name
		sbdata['date'] = randomDate(STARTDATE,ENDDATE,random.random())
		sbdata['status'] = random.choice(STATUS)
	with open(SRCDIR+OUTFILE.format(Survey=SURVEYNAMES[0]),'w') as dumpfile:
		json.dump(transform_data,dumpfile)

if __name__ == '__main__':
	main()
