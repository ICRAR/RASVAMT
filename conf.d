[program:RASVAMT]
command = /home/rasvamt/rasvamt_portal/RASVAMT/gunicorn_start
user = root
stdout_logfile = /home/rasvamt/rasvamt_portal/RASVAMT/logs/gunicorn_supervisor.log
redirect_stderr = true
