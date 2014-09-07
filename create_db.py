import sqlite3 as sql
#TABLE SCHEMA
#Going to assume drop all old tables


ras_db_schema = '''CREATE TABLE surveys
				(id text primary key,
				survey text,
				project text,
				publisher text,
				location text)
				'''
drop_db = "DROP TABLE surveys"


conn = sql.connect('rasvamt.db')
try:
	#Get connection
	#get cursor
	cur = conn.cursor()

	#Create tables may need multiple execute stmts
	cur.execute(drop_db)
	cur.execute(ras_db_schema)
	conn.commit()

except Exception as e:
	raise e
finally:
	#close data base
	conn.close()
