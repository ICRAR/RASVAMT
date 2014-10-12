from locust import HttpLocust, TaskSet, task

class UserBehavior(TaskSet):
	    def on_start(self):
		    """This is run before any task"""
		    pass
	    @task(1)
	    def index(self):
		    self.client.get("/")

class WebsiteUser(HttpLocust):
	task_set = UserBehavior
	host = "http://ec2-54-85-45-2.compute-1.amazonaws.com/"
	min_wait=5000
	max_wait=9000
