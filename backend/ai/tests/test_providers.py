import httpx
import pytest

from ai.enums import Provider
from ai.exceptions import (
    ProviderAuthError,
    ProviderConfigurationError,
    ProviderError,
    ProviderRateLimitError,
    ProviderResponseError,
    ProviderTimeoutError,
)
from ai.providers import (
    AnthropicProvider,
    GeminiProvider,
    GroqProvider,
    MockProvider,
    OpenAIProvider,
    ProviderResponse,
    build_provider,
    get_provider_class,
)
from ai.providers.openai_compatible import DeepSeekProvider
from ai.tests.conftest import FakeHTTPClient, FakeResponse


class TestProviderResponse:
    def test_total_tokens(self):
        resp = ProviderResponse(text="x", model="m", prompt_tokens=3, completion_tokens=4)
        assert resp.total_tokens == 7


class TestOpenAICompatibleAdapter:
    def _client(self):
        return FakeHTTPClient(
            FakeResponse(
                200,
                {
                    "model": "gpt-4o-mini",
                    "choices": [{"message": {"content": "hi"}}],
                    "usage": {"prompt_tokens": 5, "completion_tokens": 6},
                },
            )
        )

    def test_openai_request_and_parse(self):
        client = self._client()
        provider = OpenAIProvider(api_key="sk-test", http_client=client)
        resp = provider.complete(model="gpt-4o-mini", system="sys", user="usr", timeout=5)
        assert resp.text == "hi"
        assert resp.prompt_tokens == 5
        assert resp.completion_tokens == 6
        call = client.last_call
        assert call["url"] == "https://api.openai.com/v1/chat/completions"
        assert call["headers"]["Authorization"] == "Bearer sk-test"
        assert call["json"]["messages"][0] == {"role": "system", "content": "sys"}
        assert call["json"]["messages"][1] == {"role": "user", "content": "usr"}

    def test_groq_and_deepseek_base_urls(self):
        groq = GroqProvider(api_key="k", http_client=self._client())
        groq.complete(model="m", system="s", user="u", timeout=5)
        assert "api.groq.com" in groq._http_client.last_call["url"]

        ds = DeepSeekProvider(api_key="k", http_client=self._client())
        ds.complete(model="m", system="s", user="u", timeout=5)
        assert "api.deepseek.com" in ds._http_client.last_call["url"]

    def test_extra_params_forwarded(self):
        client = self._client()
        provider = OpenAIProvider(api_key="k", http_client=client)
        provider.complete(model="m", system="s", user="u", timeout=5, temperature=0.2)
        assert client.last_call["json"]["temperature"] == 0.2

    def test_missing_api_key_raises_config_error(self):
        provider = OpenAIProvider(api_key="", http_client=self._client())
        with pytest.raises(ProviderConfigurationError):
            provider.complete(model="m", system="s", user="u", timeout=5)

    def test_malformed_choices_raises_response_error(self):
        client = FakeHTTPClient(FakeResponse(200, {"choices": []}))
        provider = OpenAIProvider(api_key="k", http_client=client)
        with pytest.raises(ProviderResponseError):
            provider.complete(model="m", system="s", user="u", timeout=5)

    def test_null_content_defaults_to_empty(self):
        client = FakeHTTPClient(
            FakeResponse(200, {"choices": [{"message": {"content": None}}]})
        )
        provider = OpenAIProvider(api_key="k", http_client=client)
        resp = provider.complete(model="m", system="s", user="u", timeout=5)
        assert resp.text == ""


class TestHTTPFaultMapping:
    def _provider(self, response=None, raises=None):
        return OpenAIProvider(api_key="k", http_client=FakeHTTPClient(response, raises))

    def test_timeout_maps_to_timeout_error(self):
        provider = self._provider(raises=httpx.TimeoutException("t"))
        with pytest.raises(ProviderTimeoutError) as exc:
            provider.complete(model="m", system="s", user="u", timeout=1)
        assert exc.value.retryable is True

    def test_transport_error_is_retryable_provider_error(self):
        provider = self._provider(raises=httpx.ConnectError("boom"))
        with pytest.raises(ProviderError) as exc:
            provider.complete(model="m", system="s", user="u", timeout=1)
        assert exc.value.retryable is True

    def test_401_maps_to_auth_error(self):
        provider = self._provider(FakeResponse(401, text="nope"))
        with pytest.raises(ProviderAuthError) as exc:
            provider.complete(model="m", system="s", user="u", timeout=1)
        assert exc.value.retryable is False

    def test_429_maps_to_rate_limit(self):
        provider = self._provider(FakeResponse(429, text="slow down"))
        with pytest.raises(ProviderRateLimitError) as exc:
            provider.complete(model="m", system="s", user="u", timeout=1)
        assert exc.value.retryable is True

    def test_500_is_retryable_response_error(self):
        provider = self._provider(FakeResponse(500, text="server"))
        with pytest.raises(ProviderResponseError) as exc:
            provider.complete(model="m", system="s", user="u", timeout=1)
        assert exc.value.retryable is True

    def test_400_is_not_retryable(self):
        provider = self._provider(FakeResponse(400, text="bad"))
        with pytest.raises(ProviderResponseError) as exc:
            provider.complete(model="m", system="s", user="u", timeout=1)
        assert exc.value.retryable is False

    def test_non_json_body_raises_response_error(self):
        provider = self._provider(FakeResponse(200, json_data=None, text="not json"))
        with pytest.raises(ProviderResponseError):
            provider.complete(model="m", system="s", user="u", timeout=1)

    def test_client_is_closed_when_created_internally(self, monkeypatch):
        created = {}

        class _Client(FakeHTTPClient):
            def __init__(self, *a, **k):
                super().__init__(FakeResponse(200, {"choices": [{"message": {"content": "x"}}]}))
                created["client"] = self

        monkeypatch.setattr("ai.providers.base.httpx.Client", _Client)
        provider = OpenAIProvider(api_key="k")  # no injected client → base creates one
        provider.complete(model="m", system="s", user="u", timeout=1)
        assert created["client"].closed is True


class TestAnthropicAdapter:
    def test_request_and_parse(self):
        client = FakeHTTPClient(
            FakeResponse(
                200,
                {
                    "model": "claude-3-5-sonnet",
                    "content": [{"type": "text", "text": "answer"}],
                    "usage": {"input_tokens": 8, "output_tokens": 9},
                },
            )
        )
        provider = AnthropicProvider(api_key="ak", http_client=client)
        resp = provider.complete(model="claude-3-5-sonnet", system="s", user="u", timeout=5)
        assert resp.text == "answer"
        assert resp.prompt_tokens == 8
        assert resp.completion_tokens == 9
        call = client.last_call
        assert call["url"].endswith("/v1/messages")
        assert call["headers"]["x-api-key"] == "ak"
        assert call["headers"]["anthropic-version"]
        assert call["json"]["system"] == "s"
        assert call["json"]["max_tokens"] > 0

    def test_custom_max_tokens_forwarded(self):
        client = FakeHTTPClient(FakeResponse(200, {"content": [{"text": "x"}]}))
        provider = AnthropicProvider(api_key="ak", http_client=client)
        provider.complete(model="m", system="s", user="u", timeout=5, max_tokens=42)
        assert client.last_call["json"]["max_tokens"] == 42

    def test_malformed_response_raises(self):
        client = FakeHTTPClient(FakeResponse(200, {"unexpected": 1}))
        provider = AnthropicProvider(api_key="ak", http_client=client)
        with pytest.raises(ProviderResponseError):
            provider.complete(model="m", system="s", user="u", timeout=5)


class TestGeminiAdapter:
    def test_request_and_parse(self):
        client = FakeHTTPClient(
            FakeResponse(
                200,
                {
                    "candidates": [{"content": {"parts": [{"text": "gem"}]}}],
                    "usageMetadata": {"promptTokenCount": 4, "candidatesTokenCount": 5},
                },
            )
        )
        provider = GeminiProvider(api_key="gk", http_client=client)
        resp = provider.complete(model="gemini-1.5-flash", system="s", user="u", timeout=5)
        assert resp.text == "gem"
        assert resp.prompt_tokens == 4
        assert resp.completion_tokens == 5
        call = client.last_call
        assert "models/gemini-1.5-flash:generateContent" in call["url"]
        assert "key=gk" in call["url"]
        assert call["json"]["systemInstruction"]["parts"][0]["text"] == "s"

    def test_malformed_response_raises(self):
        client = FakeHTTPClient(FakeResponse(200, {"candidates": []}))
        provider = GeminiProvider(api_key="gk", http_client=client)
        with pytest.raises(ProviderResponseError):
            provider.complete(model="m", system="s", user="u", timeout=5)


class TestMockProvider:
    def test_deterministic_output_and_tokens(self):
        provider = MockProvider()
        resp = provider.complete(model="mock-model", system="a b", user="c d e", timeout=1)
        assert resp.text == "[mock:mock-model] c d e"
        assert resp.prompt_tokens == 5  # 2 (system) + 3 (user)
        assert resp.completion_tokens == len(resp.text.split())

    def test_requires_no_api_key(self):
        assert MockProvider.requires_api_key is False


class TestProviderRegistry:
    def test_get_known_provider_class(self):
        assert get_provider_class(Provider.OPENAI.value) is OpenAIProvider

    def test_get_unknown_provider_class_raises(self):
        with pytest.raises(ProviderConfigurationError):
            get_provider_class("nope")

    def test_build_provider_resolves_api_key(self, settings):
        settings.OPENAI_API_KEY = "sk-live"
        provider = build_provider(Provider.OPENAI.value)
        assert isinstance(provider, OpenAIProvider)
        assert provider.api_key == "sk-live"

    def test_build_mock_needs_no_key(self):
        provider = build_provider(Provider.MOCK.value)
        assert isinstance(provider, MockProvider)

    def test_build_unknown_provider_raises(self):
        with pytest.raises(ProviderConfigurationError):
            build_provider("nope")

    def test_build_provider_applies_base_url_override(self, settings):
        settings.AI_PROVIDER_BASE_URLS = {"openai": "https://proxy.example/v1"}
        settings.OPENAI_API_KEY = "k"
        provider = build_provider(Provider.OPENAI.value)
        assert provider.base_url == "https://proxy.example/v1"
