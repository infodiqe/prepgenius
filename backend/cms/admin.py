from django.contrib import admin

from .models import CMSBlock, CMSPage


class CMSBlockInline(admin.TabularInline):
    model = CMSBlock
    extra = 1
    fields = ["block_type", "sort_order", "content"]
    ordering = ["sort_order"]


@admin.register(CMSPage)
class CMSPageAdmin(admin.ModelAdmin):
    list_display = [
        "slug",
        "title",
        "locale",
        "status",
        "published_at",
        "updated_at",
    ]
    list_filter = ["status", "locale"]
    search_fields = ["slug", "title", "meta_title"]
    ordering = ["-updated_at"]
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = [
        (None, {"fields": ["title", "slug", "locale", "status", "published_at"]}),
        ("SEO", {"fields": ["meta_title", "meta_description"]}),
        ("Timestamps", {"fields": ["id", "created_at", "updated_at"]}),
    ]
    inlines = [CMSBlockInline]


@admin.register(CMSBlock)
class CMSBlockAdmin(admin.ModelAdmin):
    list_display = ["page", "block_type", "sort_order"]
    list_filter = ["block_type"]
    search_fields = ["page__slug", "page__title"]
    ordering = ["page", "sort_order"]
    autocomplete_fields = ["page"]
