import urllib2
import unittest
from main import app
from flask import url_for,jsonify
from flask.ext.testing import TestCase

@app.route("/jsontest/")
def json_tester():
    return jsonify(success=True)

class MyLiveTest(TestCase):
    def create_app(self):
        app.config['TESTING'] = True

        return app

    def test_some_json(self):
        response = self.client.get("/jsontest/")
        self.assertEquals(response.json, dict(success=True))

    def test_index(self):
        response = self.client.get("/")
        self.assert200(response)
    def test_static(self):
        url = url_for('static', filename='index.css')
        response = self.client.get(url)
        self.assert200(response)

if __name__ == '__main__':
    unittest.main()
