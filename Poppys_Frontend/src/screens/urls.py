from django.urls import path
from .views import *

urlpatterns = [
    path('log/', PoppysMachineLogListView.as_view(), name='poppys-machine-log-list'), # API - POSTMAN 
    path('poppys-machine-logs/', MachineReport.as_view(), name='poppys-machine-log-detail'), # HTTP Response View for Machine Report

]