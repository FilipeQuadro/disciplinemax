"""
Configuração central do Kairos.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configurações carregadas de variáveis de ambiente."""

    # Servidor
    kairos_port: int = 8000

    # Banco de dados
    database_url: str = "postgresql://postgres:postgres@localhost:5432/disciplina_app"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Qdrant (Vector DB)
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""

    # LLM
    ollama_base_url: str = "http://localhost:11434"
    openai_api_key: str = ""

    # Modelo padrão
    default_model: str = "qwen2.5:3b"
    use_ollama: bool = True

    # API NestJS
    api_base_url: str = "http://localhost:4000"

    class Config:
        env_file = ".env"


settings = Settings()
