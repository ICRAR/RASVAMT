import urllib2
import unittest
from main import app
from flask.ext.testing import LiveServerTestCase, TestCase


class MyLiveTest(LiveServerTestCase):
    def create_app(self):
        app.config['TESTING'] = True
        # Default port is 5000
        app.config['LIVESERVER_PORT'] = 5000
        return app

    def test_server_is_up_and_running(self):
        response = urllib2.urlopen(self.get_server_url())
        self.assertEqual(response.code, 200)

    def test_some_json(self):
        response = self.client.get("/sb/")
        self.assertEquals(response.json, dict(success=True))

    def test_index(self):
        response = self.client.get("/")

if __name__ == '__main__':
    unittest.main()