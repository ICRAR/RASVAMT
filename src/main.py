from flask import Flask, url_for, redirect, render_template, request, g
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
    return json.dumps(json_survey_data)

# for getting a particular survey id
@app.route('/survey/<id>/')
def get_survey(id):
    for s in json_survey_data:  #can replace with some query on SQL database
        if s['id'] == id:
            return json.dumps(s)
    return "404 Page"

# for getting all SBs. Possibly have arguments to filter the results!
@app.route('/sb/')
def get_sbs():
    return json.dumps(json_sb_data)

# for getting a particular SB
@app.route('/sb/<id>')
def get_survey_sb(id):
    for s in json_sb_data:  #can replace with some query on SQL database
        if s['id'] == id:
            return json.dumps(s)
    return "404 Page"

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

def init_db():
    with closing(connect_db()) as db:
        with app.open_resource('../db/schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

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
