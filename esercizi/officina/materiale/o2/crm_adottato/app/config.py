from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str
    SMTP_HOST: str = "mailhog"
    SMTP_PORT: int = 1025
    CSV_INPUT_PATH: str = "data/leads.csv"
    CSV_OUTPUT_PATH: str = "data/leads_output_new.csv"

    class Config:
        env_file = ".env"

settings = Settings()
