from pydantic import BaseModel, EmailStr, Field
from typing import Optional

# --- SCHEMAS DE USUÁRIO ---


class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    cpf: str
    senha: str
    nivel_acesso: int = 1
    meta: Optional[int] = 0


class UsuarioResponse(BaseModel):
    usuario_id: int
    nome: str
    email: str
    nivel_acesso: int
    cpf: str

    class Config:
        from_attributes = True


class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str


class UsuarioUpdate(BaseModel):
    nome: str
    email: EmailStr


class RedefinirSenhaEsquecida(BaseModel):
    cpf: str
    nova_senha: str


class RedefinirSenhaLogado(BaseModel):
    nova_senha: str


class ExcluirContaRequest(BaseModel):
    senha: str


# --- SCHEMAS DE QUESTÕES ---


class QuestaoCreate(BaseModel):
    disciplina: str
    assunto: str
    enunciado: str
    resposta: str  # A, B, C, D...
    alternativa_a: str
    alternativa_b: str
    alternativa_c: str
    alternativa_d: str
    explicacao: str


class QuestaoResponse(QuestaoCreate):
    questao_id: int

    class Config:
        from_attributes = True


class RespostaQuestao(BaseModel):
    questao_id: int
    alternativa_escolhida: str  # Ex: "A" ou "B"

    class Config:
        from_attributes = True


class QuestaoParaAluno(BaseModel):
    questao_id: int
    enunciado: str
    alternativa_a: str
    alternativa_b: str
    alternativa_c: str
    alternativa_d: str
    # Note que NÃO inclui a resposta_correta aqui

    class Config:
        from_attributes = True


# --- SCHEMAS DE ESTATÍSTICAS ---


class Engajamento(BaseModel):
    portugues: int
    matematica: int
    historia: int
    geografia: int
    ingles: int


class EstatisticasUsuario(BaseModel):
    total_respondidas: int
    total_acertos: int
    total_erros: int
    taxa_acerto: float
    engajamento: Optional[Engajamento] = None

    class Config:
        from_attributes = True
