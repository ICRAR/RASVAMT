from selenium import webdriver
import unittest
import argparse

hosts = [ host.strip("\n") for host in open('../logs/hosts_file','r').xreadlines() ] 
#Just use last host from host file
HOST = hosts[len(hosts)-1]
LOCALHOST='http://localhost:5000/'

class SeleniumTestCase(unittest.TestCase):
	client = None

	@classmethod
	def setUpClass(self):
		try:
			self.client = webdriver.Chrome()
		except:
			print "Failed to get webdriver. Make sure chromedriver is in path\n"
			print "If shell is bash export PATH=$PATH:."
			pass

	@classmethod 
	def tearDownClass(self): 
		if self.client:
		 # stop the flask server and the browser 
		 	self.client.get(LOCALHOST+'shutdown')
		 	self.client.close()
	def setUp (self): 
		if not self.client: 
			self.skipTest('Web browser not available')
	def tearDown(self): 
		pass
	def test_home_page(self):
		self.client.get(LOCALHOST)
		assert self.client.title == 'Rasvamt'


if __name__ == '__main__':
	unittest.main()
	#This requires chromedriver


