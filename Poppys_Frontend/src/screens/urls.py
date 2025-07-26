from django.urls import path
from .views import *
 
urlpatterns = [
    path('log/', PoppysMachineLogListView.as_view(), name='poppys-machine-log-list'), # API - POSTMAN 
    path('poppys-machine-logs/', MachineReport.as_view(), name='poppys-machine-log-detail'), # HTTP Response View for Machine Report
    path('poppys-machine-logs/raw/', MachineRawDataReport.as_view(), name='machine-raw-data-report'), # Machine Raw Data
    path('line-report/', LineReport.as_view(), name='line-report'), # API for Line Report
    path('line-report/raw/', LineRawDataReport.as_view(), name='line-raw-data-report'), # Line Raw Data
    path('operator-report/', OperatorReport.as_view(), name='operator-report'), # API for Operator Report
    path('operator-report/raw/', OperatorRawDataReport.as_view(), name='operator-raw-data-report'), # Operator Raw Data
]