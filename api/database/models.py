from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .connection import Base
import datetime

# Função auxiliar para garantir o registro correto do fuso horário (GMT-3)
def obter_horario_brasilia():
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))

class Usuario(Base):
    __tablename__ = "usuarios"
    usuario_id = Column(Integer, primary_key=True, index=True)
    nivel_acesso = Column(Integer, default=0)  # TINYINT
    cpf = Column(String(11), unique=True, index=True)
    nome = Column(String(50))
    email = Column(String(50), unique=True, index=True)
    senha = Column(String(255))
    meta = Column(Integer)  # TINYINT UNSIGNED

    # cascade="all, delete-orphan" garante que se o usuário for apagado, suas estatísticas sumirão
    estatisticas = relationship("Estatistica", back_populates="usuario", cascade="all, delete-orphan")


class Questao(Base):
    __tablename__ = "questoes"
    questao_id = Column(Integer, primary_key=True, index=True)
    # SET NULL: Se o admin que criou a questão for deletado, a questão não é apagada do sistema
    criado_por = Column(
        Integer, ForeignKey("usuarios.usuario_id", ondelete="SET NULL")
    ) 
    data = Column(Integer)  # YEAR no diagrama
    disciplina = Column(String(50))
    assunto = Column(String(50))
    enunciado = Column(Text)
    resposta = Column(String(1))  # CHAR(1)
    alternativa_a = Column(String(150))
    alternativa_b = Column(String(150))
    alternativa_c = Column(String(150))
    alternativa_d = Column(String(150))
    explicacao = Column(Text)

    autor = relationship("Usuario")
    # cascade="all, delete-orphan" resolve o erro SQLAlchemy: apaga estatísticas ao deletar a questão
    estatisticas = relationship("Estatistica", back_populates="questao", cascade="all, delete-orphan")


class Estatistica(Base):
    __tablename__ = "estatisticas"
    usuario_id = Column(
        Integer, ForeignKey("usuarios.usuario_id", ondelete="CASCADE"), primary_key=True
    )
    # ondelete="CASCADE" reforça a regra direto no banco de dados SQLite/Postgres
    questao_id = Column(
        Integer, ForeignKey("questoes.questao_id", ondelete="CASCADE"), primary_key=True
    )
    acertou = Column(Boolean)  # TINYINT(1) funciona como booleano
    tentativas = Column(Integer)
    data = Column(DateTime, default=obter_horario_brasilia)

    usuario = relationship("Usuario", back_populates="estatisticas")
    questao = relationship("Questao", back_populates="estatisticas")