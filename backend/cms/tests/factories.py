import factory
from factory.django import DjangoModelFactory

from cms.models import CMSBlock, CMSPage


class CMSPageFactory(DjangoModelFactory):
    class Meta:
        model = CMSPage
        skip_postgeneration_save = True

    slug = factory.Sequence(lambda n: f"page-{n}")
    title = factory.Sequence(lambda n: f"Page {n}")
    meta_title = ""
    meta_description = ""
    locale = "as"
    status = "published"


class DraftCMSPageFactory(CMSPageFactory):
    status = "draft"


class CMSGuideFactory(CMSPageFactory):
    """A published study-guide page (T45)."""

    page_type = "guide"
    category = "CTET"


class CMSBlockFactory(DjangoModelFactory):
    class Meta:
        model = CMSBlock
        skip_postgeneration_save = True

    page = factory.SubFactory(CMSPageFactory)
    block_type = "rich_text"
    sort_order = factory.Sequence(lambda n: n)
    content = factory.LazyFunction(lambda: {"html": "<p>Hello</p>"})
