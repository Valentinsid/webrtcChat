from django.db import models
import stun
from django.conf import settings
from uuid import getnode as get_mac

class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,)
    date_of_birth = models.DateField(blank=True, null=True)
    photo = models.ImageField(upload_to='users/%Y/%m/%d', blank=True)
    nat_type = models.TextField(default = 'NAT')
    ip_address = models.GenericIPAddressField(protocol='IPv4', default="11.11.11.11")
    port = models.IntegerField(default = 0)
    is_ip_correct = models.BooleanField(default = True)
    ice_candidates = models.TextField(default = 0)
    first = models.BooleanField(default = False)
    first_ice = models.BooleanField(default = True)
    ice_candidates_temp = models.TextField(default = 0)

    def __str__(self):
        return 'Profile for user {}'.format(self.user.username)