from selenium import webdriver

hosts = #read hosts from file
#Could have class simple for now

#This requires chromedriver
driver = webdriver.Chrome()

driver.get(hosts)

assert driver.title = 'Rasvamt'
