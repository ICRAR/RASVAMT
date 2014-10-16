# Main application for deploying RASVAMT application
# Copyright (C) 2014  Cameron Poole & Joseph Dunne
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

from flask import Flask, url_for, redirect, render_template, request, g, jsonify,Response
from contextlib import closing

from werkzeug.contrib.fixers import ProxyFix
import json
import sqlite3

#Config settings
DATABASE = '../db/rasvamt.db'
DEBUG = True

app = Flask(__name__)
app.config.from_object(__name__)

#json_survey_data is assumed to contain ALL surveys
json_survey_file = open('./static/WallabyDingoGamaSurvey.json')
json_survey_data = json.load(json_survey_file)
json_survey_file.close()

#json_sb_data assumed to contain ALL SBs, even from other surveys
json_sb_file = open('./static/WallabyTest.json')
json_sb_data = json.load(json_sb_file)
json_sb_file.close()

# send the root HTML page. "app.send_static_file" sends files located in 'static'.
@app.route('/')
def root():
    return app.send_static_file('index.html')

# example of sending files needed for the HTML page to load.
# as seen in index.html, href="/file/jquery.mobile-1.4.2.min.css" for a stylesheet
@app.route('/file/<path:filename>')
def get_file(filename):
    return app.send_static_file(filename)

# should return all the surveys. Possibly have arguments to filter results!
@app.route('/survey/')
def get_surveys():
    return Response(json.dumps(json_survey_data),  mimetype='application/json')

def check_survey(id):
    return bool(json_survey_data[int(id)])

# for getting a particular survey id
@app.route('/survey/<id>/')
def get_survey(id):
    if check_survey(id):
            return Response(json.dumps(json_survey_data[int(id)]),  mimetype='application/json')
    return "404 Page"

# for getting all SBs. Possibly have arguments to filter the results!
@app.route('/sb/')
def get_sbs():
    return Response(json.dumps(json_sb_data),  mimetype='application/json')

def check_id(id):
    return bool(json_sb_data[int(id)])

# for getting a particular SB
@app.route('/sb/<id>')
def get_survey_sb(id):
    if check_id(id):
            return jsonify(json_sb_data[int(id)])
    return "404 Page"

# TODO function to pull out all json sbs with ids
# For now pull from json but have sample code for database
@app.route('/sbs/<ids>')
def get_multi_sbs(ids):
    multi_sb = []
    for eachsb in ids.split('+'):
        if check_id:
            multi_sb.append(json_sb_data[int(eachsb)])
        else:
            #skip any bad 
            continue
    # db_query
    # Using the db would be for each_sb in executemany?? get_query(db_query,ids)
    return  Response(json.dumps(multi_sb),  mimetype='application/json')


# JUST AN EXAMPLE
# an example of rendering templates. This sets 'title' to the argument 'message' in the GET request.
@app.route('/rename')
def rename():
    message = request.args.get('message')
    # this function looks in the 'templates' folder
    return render_template('index.html', title=message)

# JUST AN EXAMPLE
# example of using arguments in the GET request
@app.route('/getdata')
def get_data():
    message=request.args.get('myParam')
    return ('you wrote ' + message)


def connect_db():
    return sqlite3.connect(app.config['DATABASE'])

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = connect_db()
    return db

def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

@app.route('/investigators/<id>')
def get_investigator(id):
    return render_template('investigators.html', 
        investigators=query_db("select * from investigators where id = {}".format(id)),
        title="Investigators")

# TODO Custom html
#@app.errorhandler(404)
#def page_not_found(e):
#    return render_template('404.html'), 404

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


if __name__ == '__main__':
    # Could expand arguments but that will do 
    import argparse
    parser = argparse.ArgumentParser(description='Flask application for Rasvamt')
    parser.add_argument('-l', action="store_true", dest="runlocal", default=False,help="Run deployment locally")
    args = parser.parse_args()
    if args.runlocal:
        app.run()
    # For deployment
    else:
        app.wsgi_app = ProxyFix(app.wsgi_app)
        app.run(host='0.0.0.0', port=8000)
