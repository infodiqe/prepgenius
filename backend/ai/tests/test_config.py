from decimal import Decimal

import pytest

from ai.enums import PromptType, Provider
from ai.exceptions import ProviderConfigurationError
from ai.services import config


class TestProviderChain:
    def test_returns_configured_chain(self, settings):
        settings.AI_PROVIDER_CHAIN = ["groq", "openai"]
        assert config.provider_chain() == ["groq", "openai"]


class TestApiKeyResolution:
    def test_resolves_per_provider_key(self, settings):
        settings.GROQ_API_KEY = "g"
        settings.OPENAI_API_KEY = "o"
        assert config.provider_api_key(Provider.GROQ.value) == "g"
        assert config.provider_api_key(Provider.OPENAI.value) == "o"

    def test_mock_has_no_key(self):
        assert config.provider_api_key(Provider.MOCK.value) == ""

    def test_unknown_provider_returns_empty(self):
        assert config.provider_api_key("nope") == ""


class TestBaseUrlOverride:
    def test_returns_override_when_set(self, settings):
        settings.AI_PROVIDER_BASE_URLS = {"openai": "https://x/v1"}
        assert config.provider_base_url("openai") == "https://x/v1"

    def test_returns_none_when_absent(self, settings):
        settings.AI_PROVIDER_BASE_URLS = {}
        assert config.provider_base_url("openai") is None


class TestResolveModel:
    def test_override_wins(self):
        assert config.resolve_model(PromptType.QUESTION_HINT, "openai", "custom") == "custom"

    def test_per_operation_mapping(self, settings):
        settings.AI_MODELS = {"question_hint": {"openai": "op-model"}}
        assert config.resolve_model(PromptType.QUESTION_HINT, "openai") == "op-model"

    def test_falls_back_to_provider_default(self, settings):
        settings.AI_MODELS = {}
        settings.AI_DEFAULT_MODELS = {"openai": "default-model"}
        assert config.resolve_model(PromptType.QUESTION_HINT, "openai") == "default-model"

    def test_unresolvable_raises(self, settings):
        settings.AI_MODELS = {}
        settings.AI_DEFAULT_MODELS = {}
        with pytest.raises(ProviderConfigurationError):
            config.resolve_model(PromptType.QUESTION_HINT, "openai")

    def test_accepts_raw_string_prompt_type(self, settings):
        settings.AI_MODELS = {"tutor_chat": {"groq": "m"}}
        assert config.resolve_model("tutor_chat", "groq") == "m"


class TestRetryConfig:
    def test_reads_settings(self, settings):
        settings.AI_MAX_RETRIES = 4
        settings.AI_RETRY_BACKOFF_SECONDS = 1.5
        settings.AI_REQUEST_TIMEOUT_SECONDS = 12.0
        rc = config.retry_config()
        assert rc.max_retries == 4
        assert rc.backoff_seconds == 1.5
        assert rc.timeout_seconds == 12.0


class TestComputeCost:
    def test_zero_when_no_pricing(self, settings):
        settings.AI_TOKEN_PRICING = {}
        assert config.compute_cost("openai", "m", 1000, 1000) == Decimal("0")

    def test_computes_from_pricing(self, settings):
        settings.AI_TOKEN_PRICING = {
            "openai": {"gpt": {"prompt": "0.5", "completion": "1.5"}}
        }
        # 2000 prompt tokens @0.5/1k = 1.0 ; 1000 completion @1.5/1k = 1.5 → 2.5
        cost = config.compute_cost("openai", "gpt", 2000, 1000)
        assert cost == Decimal("2.500000")

    def test_unknown_model_is_zero(self, settings):
        settings.AI_TOKEN_PRICING = {"openai": {"gpt": {"prompt": "1"}}}
        assert config.compute_cost("openai", "other", 1000, 1000) == Decimal("0")
