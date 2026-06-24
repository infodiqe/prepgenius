from django.urls import path

from cms.api.views import (
    PublicCMSPageDetail,
    PublicCMSPageList,
    PublicGuideDetail,
    PublicGuideList,
)

app_name = "cms"

urlpatterns = [
    path("pages/", PublicCMSPageList.as_view(), name="page-list"),
    path("pages/<slug:slug>/", PublicCMSPageDetail.as_view(), name="page-detail"),
    path("guides/", PublicGuideList.as_view(), name="guide-list"),
    path("guides/<slug:slug>/", PublicGuideDetail.as_view(), name="guide-detail"),
]
