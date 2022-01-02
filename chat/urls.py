from django.urls import path, include
from django.conf.urls import url 
from .views import main_view, register, edit, login, activate

urlpatterns = [
	path('', main_view, name='main_view'),
]

urlpatterns += [
    path('accounts/login/', login, name='login'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('register/', register, name='register'),
    path('activate/<uidb64>/<token>', activate, name='activate'),
    path('edit/', edit, name='edit'),
]