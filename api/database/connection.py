from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event
from sqlalchemy.engine import Engine
import os


# Pega o caminho da pasta onde o arquivo connection.py está
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Une esse caminho com o nome do banco
DB_PATH = os.path.join(BASE_DIR, "extude.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
# O motor que conversa com o banco
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
# A fábrica de sessões (para podermos salvar/ler dados)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# A classe base que todas as nossas tabelas vão herdar
Base = declarative_base()


# Função para usar o banco nas rotas depois
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Função para que o CASCADE funcione corretamente
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()