from django.db import models
from rest_framework.permissions import BasePermission



class MachineLog(models.Model):
    MACHINE_ID = models.IntegerField()
    LINE_NUMB = models.IntegerField()
    OPERATOR_ID = models.CharField(max_length=30)
    DATE = models.DateField(db_index=True)  # Index added
    START_TIME = models.TimeField()
    END_TIME = models.TimeField()
    
    MODE = models.IntegerField(db_index=True)  # Index added
    STITCH_COUNT = models.IntegerField()
    NEEDLE_RUNTIME = models.FloatField()
    NEEDLE_STOPTIME = models.FloatField()
    Tx_LOGID = models.IntegerField()
    Str_LOGID = models.IntegerField()
    DEVICE_ID = models.IntegerField()
    RESERVE = models.TextField(blank=True, null=True)
        # ✅ NEW FIELDS ADDED
    AVERG = models.IntegerField(default=0, null=False, blank=False)
    PIECECNT = models.IntegerField(default=0, null=False, blank=False)
    
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)  # Index added
    
    class Meta:
        indexes = [
            models.Index(fields=['DATE']),
            models.Index(fields=['created_at']),
            models.Index(fields=['MODE']),
        ]
    def save(self, *args, **kwargs):
        """Override save to ensure defaults are properly set"""
        if self.AVERG is None:
            self.AVERG = 0
        if self.PIECECNT is None:
            self.PIECECNT = 0
        super().save(*args, **kwargs)



     
""" Operator ID (RFID Card No) - real datafetching from MachineLog table For Ex: OPERATOR 1, OPERATOR 2, etc., """      
""" Assigning Operator Name to Operator ID (Operator Master for Poppys)"""      
class Operator(models.Model):
    
    rfid_card_no = models.CharField(max_length=20, unique=True)
    operator_name = models.CharField(max_length=50)
    remarks = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.operator_name


class DuplicateLog(models.Model):
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

class ModeMessage(models.Model):
    mode = models.IntegerField(unique=True)
    message = models.TextField()

    def __str__(self):
        return f"Mode {self.mode}: {self.message}"

""" Common User Module """
class User(models.Model):
    GROUP_CHOICES = [
        ('poppys', 'Poppys'),
        ('shakthi', 'Shakthi Infra'),
    ]
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    group = models.CharField(max_length=20, choices=GROUP_CHOICES, default='poppys')

    def __str__(self):
        return self.username


""" User Permission Class for Poppys """
class IsPoppysUser(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'group') and request.user.group == 'poppys'


""" Class for MQTT messages from machines """
# logs/models.py

class MachineData(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    message = models.TextField()

    def __str__(self):
        return f"[{self.timestamp}] {self.message}"


    
