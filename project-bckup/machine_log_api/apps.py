from django.apps import AppConfig

class MachineLogApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'machine_log_api'

    def ready(self):
        from mqtt.mqtt_client import start_mqtt
        start_mqtt()
