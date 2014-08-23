from flask import Flask, url_for, redirect, render_template, request
import json
app = Flask(__name__)

#json_survey_data is assumed to contain ALL surveys
json_survey_file = open('./static/WallabyDingoGamaSurvey.json')
json_survey_data = json.load(json_survey_file)
json_survey_file.close()

#json_sb_data assumed to contain ALL SBs, even from other surveys
json_sb_file = open('./static/WallabyObs.json')
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

# should return all the surveys
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

# for getting all SBs
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

if __name__ == '__main__':
    # For Testing
    app.debug = True
    app.run()
    # For deployment
    #app.run(host='0.0.0.0', port=5000)
