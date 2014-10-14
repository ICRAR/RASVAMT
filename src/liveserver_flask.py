import urllib2
import unittest
from main import app
from flask import url_for,jsonify
from flask.ext.testing import LiveServerTestCase

@app.route("/jsontest/")
def json_tester():
    return jsonify(success=True)

class MyLiveTest(LiveServerTestCase):
    def create_app(self):
        app.config['TESTING'] = True
        app.config['LIVESERVER_PORT'] = 5000
        return app

    def test_server_is_up_and_running(self):
        response = urllib2.urlopen(self.get_server_url())
        self.assertEqual(response.code, 200)

if __name__ == '__main__':
    unittest.main()
