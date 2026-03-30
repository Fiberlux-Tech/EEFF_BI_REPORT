"""Centralized configuration — single point of truth for all environment variables."""

import functools
import os
from dataclasses import dataclass, field



@dataclass(frozen=True)
class DatabaseConfig:
    driver: str = ""
    server: str = ""
    database: str = ""
    uid: str = ""
    pwd: str = ""
    connect_timeout: int = 30
    query_timeout: int = 120
    encrypt: str = "yes"
    trust_cert: str = "no"


@dataclass(frozen=True)
class Config:
    log_level: str = "INFO"
    output_dir: str = "."
    strict_bs_balance: bool = False  # True = raise on BS imbalance; False = warn only
    db: DatabaseConfig = field(default_factory=DatabaseConfig)


@functools.lru_cache(maxsize=1)
def get_config() -> Config:
    """Build Config from environment variables (call after load_dotenv)."""
    return Config(
        log_level=os.environ.get("LOG_LEVEL", "INFO"),
        output_dir=os.environ.get("OUTPUT_DIR", "."),
        strict_bs_balance=os.environ.get("STRICT_BS_BALANCE", "").lower() in ("1", "true", "yes"),
        db=DatabaseConfig(
            driver=os.environ.get("DB_DRIVER", ""),
            server=os.environ.get("DB_SERVER", ""),
            database=os.environ.get("DB_DATABASE", ""),
            uid=os.environ.get("DB_UID", ""),
            pwd=os.environ.get("DB_PWD", ""),
            connect_timeout=int(os.environ.get("DB_CONNECT_TIMEOUT", "30")),
            query_timeout=int(os.environ.get("DB_QUERY_TIMEOUT", "120")),
            encrypt=os.environ.get("DB_ENCRYPT", "yes"),
            trust_cert=os.environ.get("DB_TRUST_CERT", "no"),
        ),
    )
