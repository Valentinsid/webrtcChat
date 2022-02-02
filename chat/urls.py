from django.urls import path, include
from django.conf.urls import url 
from .views import main_view, register, edit, login, activate, activate_ice

urlpatterns = [
	path('', main_view, name='main_view'),
]
urlpatterns += [
  path('', include('social_django.urls', namespace='social')),
]
urlpatterns += [
    path('accounts/login/', login, name='login'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('register/', register, name='register'),
    path('activate/<uidb64>/<token>', activate, name='activate'),
    path('activate2/<uidb64>/<token>', activate_ice, name='activate_ice'),
    path('edit/', edit, name='edit'),
]