# Script to create database for rasvama 
# Still a number of fiddly problems with json arrays
# Lovingly and tenderly created by Cam
# Hopefully this gives enough of a platform to extend
# TODO : 
# Fix coverage problem

import sqlite3 as sql
import json
from itertools import chain

#Going to assume drop all old tables
drop_db = """DROP TABLE if EXISTS surveys ;
            DROP TABLE  if EXISTS investigators;
            DROP TABLE  if EXISTS eso;
            DROP TABLE  if EXISTS observationblocks;
            DROP TABLE  if EXISTS coverage;
            DROP TABLE  if EXISTS history;"""


#Use None to insert a NULL:

#dict = {'location': 'somewhere', 'arrival': '1000', 'departure': None}
#You can use a default dictionary and a generator to use this with executemany():

#defaults = {'location': '', 'arrival': None, 'departure': None}

#c.executemany(SQL, ({k: d.get(k, defaults[k]) for k in defaults} for d in your_dict) 
OBDEFAULTS = {
'currentQCStatus': None,
 'currentStatus': None,
 'executionTime': None,
 'id': 0,
 'instrument': None,
 'nbPawprints': 0,
 'period': 0,
 'programID': None,
 'runID': None,
 'telescope': None,
 'tilePattern': None,
 'userPriority': None
}
conn = sql.connect('rasvamt.db')
try:
    #Get connection
    #get cursor
    cur = conn.cursor()

    #Create tables may need multiple execute stmts
    cur.executescript(drop_db)
    #TODO load scehma from file
    with open("schema.sql",'r') as dbschema:
        cur.executescript(dbschema.read())
        conn.commit()

    myjson = json.load(open('../src/static/WallabyTest.json','r'))
    #No real nice way to get stuff into db without manipulating dicts
    for count, line in enumerate(myjson):
        ESO = line.pop('ESO')
        ESO['id'] = count
        investigators = line.pop('investigators')
        #Add room for more investigators
        investigators.extend([None] * (4 - len(investigators)))
        line['surveyId'] = line.pop('id')
        line.update({'id':count})
        investigators.insert(0,count)
        OB = ESO.pop('observationBlock')
        OB['id'] = count
        HIST = OB.pop('historyStatus')
        COVERAGE = OB.pop('tileCoverage')
        COVERAGE = list(chain(*COVERAGE))
        #COVERAGE[0].extend([None] * (8 - len(COVERAGE[1])))
        COVERAGE[0].insert(0,count)
        #Now perform inserts
        cur.execute("""INSERT INTO surveys 
                        VALUES (:id, :creator, :date, 
                                :surveyId, :project,
                                :status )""", line)
        cur.execute("INSERT INTO investigators VALUES (?,?,?,?,?)",investigators)
        cur.execute("""INSERT INTO observationblocks VALUES (:id,
                                                            :currentQCStatus,
                                                            :currentStatus,
                                                            :executionTime,
                                                            :instrument ,
                                                            :nbPawprints ,
                                                            :period ,
                                                            :programID,
                                                            :runID ,
                                                            :telescope ,
                                                            :tilePattern ,
                                                            :userPriority 
                                                            )""", OB)
        cur.execute("INSERT INTO ESO VALUES (:id, :metadataType, :programID)", ESO)
        #cur.execute("INSERT INTO coverage VALUES (?,?,?,?,?,?,?,?,?)",COVERAGE)

        conn.commit()
except Exception as e:
    raise e
finally:
    #close data base
    conn.close()
