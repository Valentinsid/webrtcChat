from django.urls import path, include
from django.conf.urls import url 
from .views import main_view, register, edit, login, activate, activate2

urlpatterns = [
	path('', main_view, name='main_view'),
]

urlpatterns += [
    path('accounts/login/', login, name='login'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('register/', register, name='register'),
    path('activate/<uidb64>/<token>', activate, name='activate'),
    path('activate2/<uidb64>/<token>', activate2, name='activate2'),
    path('edit/', edit, name='edit'),
]