from django.urls import path

from cms.api.views import PublicCMSPageDetail, PublicCMSPageList

app_name = "cms"

urlpatterns = [
    path("pages/", PublicCMSPageList.as_view(), name="page-list"),
    path("pages/<slug:slug>/", PublicCMSPageDetail.as_view(), name="page-detail"),
]
