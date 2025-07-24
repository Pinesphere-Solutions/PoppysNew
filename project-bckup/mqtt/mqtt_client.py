import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "sewingmachine/data"

def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected with result code {rc}")
    client.subscribe(TOPIC)

def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    print(f"[MQTT] Message received on {msg.topic}: {payload}")

    # ✅ Save to database
    try:
        from logs.models import MachineData
        MachineData.objects.create(message=payload)
        print("[MQTT] Message saved to DB")
    except Exception as e:
        print(f"[MQTT] Error saving message: {e}")

def start_mqtt():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER, PORT, 60)
    client.loop_start()
