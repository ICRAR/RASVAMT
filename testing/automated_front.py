from selenium import webdriver
import unittest
import argparse

hosts = [ host.strip("\n") for host in open('../logs/hosts_file','r').xreadlines() ] 
#Just use last host from host file
HOST = hosts[len(hosts)-1]

#Currently only testing local deployment but change LOCALHOST 
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
	def check_filter_menu(self):
		filter_menu = self.client.find_element_by_class_name('toggle_filter_menu')
		webdriver.ActionChains(self.client.driver).move_to_element(filter_menu).click(filter_menu).perform()
	def check_goto_control(self):
		goto_control = self.client.find_element_by_css_selector('.aladin-goto_control')
		pass
	def check_layer_control(self):
		layer_control = self.client.find_element_by_css_selector('.aladin-layersControl')
		pass


if __name__ == '__main__':
	unittest.main()
	#This requires chromedriver


