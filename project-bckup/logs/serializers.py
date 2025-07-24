from rest_framework import serializers
from .models import MachineLog, ModeMessage, Operator
from datetime import datetime

MODES = {
    1: "Sewing",
    2: "Idle",
    3: "Meeting",
    4: "No Feeding",
    5: "Maintenance",
    6: "Rework",
    7: "Needle Break",
}

class MachineLogSerializer(serializers.ModelSerializer):
    DATE = serializers.CharField()  # Accept date as a string initially
    START_TIME = serializers.CharField()  # Accept time as a string initially
    END_TIME = serializers.CharField()  # Accept time as a string initially
    operator_name = serializers.SerializerMethodField()
    mode_description = serializers.SerializerMethodField()

    class Meta:
        model = MachineLog
        fields = '__all__'  # Keep all existing fields + added fields

    def get_operator_name(self, obj):
        try:
            operator = Operator.objects.get(rfid_card_no=obj.OPERATOR_ID)
            return operator.operator_name
        except Operator.DoesNotExist:
            return None

    def get_mode_description(self, obj):
        # First try to get from ModeMessage model
        mode_message = ModeMessage.objects.filter(mode=obj.MODE).first()
        if mode_message:
            return mode_message.message
        
        # Fall back to MODES dictionary if no database record found
        from .views import MODES
        return MODES.get(obj.MODE, "N/A")

    def validate_DATE(self, value):
        try:
            date_obj = datetime.strptime(value, '%Y:%m:%d').date()
            return date_obj
        except ValueError:
            raise serializers.ValidationError("Date must be in YYYY:MM:DD format")

    def validate_START_TIME(self, value):
        return self._validate_time(value)

    def validate_END_TIME(self, value):
        return self._validate_time(value)

    def _validate_time(self, value):
        try:
            parts = value.split(':')
            if len(parts) == 3:
                hour, minute, second = parts
                time_str = f"{int(hour):02d}:{int(minute):02d}:{int(second):02d}"
            elif len(parts) == 2:
                hour, minute = parts
                time_str = f"{int(hour):02d}:{int(minute):02d}:00"
            else:
                raise ValueError("Invalid time format")
            time_obj = datetime.strptime(time_str, '%H:%M:%S').time()
            return time_obj
        except ValueError:
            raise serializers.ValidationError("Time must be in HH:MM:SS format")

