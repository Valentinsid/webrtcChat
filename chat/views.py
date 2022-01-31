from django.shortcuts import render
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .forms import UserRegistrationForm
from .models import Profile
from django.conf import settings
from django.contrib import auth
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import render,redirect
from django.urls import reverse
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.sites.shortcuts import get_current_site
from django.utils.encoding import force_bytes, force_text
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.template.loader import render_to_string
from .tokens import account_activation_token
from django.contrib.auth.models import User
from django.core.mail import EmailMessage

@login_required
def main_view(request):
    context = {}
    num_visits=request.session.get('num_visits', 0)
    request.session['num_visits'] = num_visits+1
    return render(request, 'chat/main.html', context={'num_visits':num_visits})


def register(request):
    if request.method == 'POST':
        user_form = UserRegistrationForm(request.POST)
        if user_form.is_valid():
            new_user = user_form.save(commit=False)
            new_user.set_password(user_form.cleaned_data['password'])
            new_user.save()
            profile = Profile.objects.create(user=new_user)
            return render(request, 'chat/register_done.html', {'new_user': new_user})
    else:
        user_form = UserRegistrationForm()
    return render(request, 'chat/register.html', {'user_form': user_form})

from django.contrib.auth import authenticate
from django.contrib.auth import login as auth_login

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def login(request):
    if request.method == 'POST':
        form = AuthenticationForm(request.POST)
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(username=username,password=password)
        if user:
            if user.profile.first == True:
                print(get_client_ip(request), user.profile.ip_address, request.META['HTTP_USER_AGENT'])
                if get_client_ip(request) == user.profile.ip_address:
                    user.profile.is_ip_correct = True
                else:
                    user.profile.is_ip_correct = False
                    current_site = get_current_site(request)
                    mail_subject = 'Обновите ваш IP.'
                    message = render_to_string('chat/acc_active_email.html', {
                        'user': user,
                        'domain': current_site.domain,
                        'uid':urlsafe_base64_encode(force_bytes(user.pk)),
                        'token':account_activation_token.make_token(user),
                    })
                    to_email = user.email
                    email = EmailMessage(
                                mail_subject, message, to=[to_email]
                    )
                    email.content_subtype = 'html'
                    email.send()
            if user.profile.first == False:
                user.profile.ip_address = get_client_ip(request)
                user.profile.first = True
            user.profile.save()                    
            auth_login(request,user)
            return render(request, 'chat/main.html', context={'user':user})
        else:
            messages.error(request,'username or password not correct')
            return render(request, 'chat/incorrect_user.html', context={'user':user})
    else:
        form = AuthenticationForm()
    return render(request,'registration/login.html',{'form':form})

def activate(request, uidb64, token):
    try:
        uid = force_text(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except(TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None
    if user is not None and account_activation_token.check_token(user, token):
        user.profile.is_ip_correct = True
        user.profile.ip_address = get_client_ip(request)
        user.profile.save()
        auth_login(request, user)
        return render(request, 'chat/main.html', context={'user':user})
    else:
        return render(request, 'chat/main.html', context={'user':user})

def activate_ice(request, uidb64, token):
    try:
        uid = force_text(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except(TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None
    if user is not None and account_activation_token.check_token(user, token):
        user.profile.ice_candidates = user.profile.ice_candidates_temp        
        user.profile.save()
        return render(request, 'chat/ice_activated.html', context={'user':user})
    else:
        return render(request, 'chat/main.html', context={'user':user})

from .forms import UserRegistrationForm, UserEditForm, ProfileEditForm

@login_required
def edit(request):
    if request.method == 'POST':
        user_form = UserEditForm(instance=request.user, data=request.POST)
        profile_form = ProfileEditForm(instance=request.user.profile, data=request.POST, files=request.FILES)
        new_user = user_form.save(commit=False)
        if user_form.is_valid() and profile_form.is_valid():
            new_user = user_form.save(commit=False)
            print('success')
            user_form.save()
            profile_form.save()
        return render(request, 'chat/edit_done.html', {'new_user': new_user} )    
    else:
        user_form = UserEditForm(instance=request.user)
        profile_form = ProfileEditForm(instance=request.user.profile)
        return render(request,
                      'chat/edit.html',
                      {'user_form': user_form,
                       'profile_form': profile_form})