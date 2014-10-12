import urllib2
from flask import Flask
from flask.ext.testing import LiveServerTestCase



class MyTest(LiveServerTestCase):

    def create_app(self):
        app = Flask(__name__)
        app.config['TESTING'] = True
        # Default port is 5000
        return app
    @app.route("/sb/")
    def some_json():
	    return jsonify(success=True)
    def test_server_is_up_and_running(self):
        response = urllib2.urlopen(self.get_server_url())
        self.assertEqual(response.code, 200)

    
    def test_some_json(self):
        response = self.client.get("/sb/")
        self.assertEquals(response.json, dict(success=True))
