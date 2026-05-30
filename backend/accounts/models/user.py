from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model — always define a custom user before the first migration
    so future fields (phone, preferred_language, consent, etc.) can be added
    without a painful auth.User swap later.
    """

    class Meta(AbstractUser.Meta):
        swappable = "AUTH_USER_MODEL"
