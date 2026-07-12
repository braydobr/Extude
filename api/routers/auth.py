from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from api.database.connection import get_db
from api.database import models
import api.schemas as schemas
from api.utils.auth_utils import verificar_senha, criar_token_acesso, decodificar_token

router = APIRouter(prefix="/auth", tags=["Autenticação"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


@router.post("/login")
def login(
    dados_login: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.cpf == dados_login.username)
        .first()
    )

    if not usuario or not verificar_senha(dados_login.password, usuario.senha):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CPF ou senha incorretos",
        )

    # O tempo de expiração é definido dentro da função criar_token_acesso no auth_utils.py
    token = criar_token_acesso(
        dados={
            "sub": usuario.cpf,
            "id": usuario.usuario_id,
            "nivel_acesso": usuario.nivel_acesso,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario.usuario_id,
            "nome": usuario.nome,
            "nivel": usuario.nivel_acesso,
        },
    }


@router.post("/logout")
def logout():
    """
    Rota para encerrar a sessão.
    No JWT, o logout é feito principalmente no frontend deletando o token,
    mas esta rota serve para formalizar a ação e facilitar auditorias futuras.
    """
    return {
        "detail": "Sessão encerrada com sucesso. Remova o token do armazenamento local."
    }


# DEPENDÊNCIAS DE SEGURANÇA


async def obter_usuario_atual(token: str = Depends(oauth2_scheme)):
    """
    Valida o token em cada requisição.
    Se o tempo expirou, decodificar_token retornará None e lançará 401.
    """
    payload = decodificar_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão expirada ou inválida. Por favor, faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def verificar_admin(usuario_logado: dict = Depends(obter_usuario_atual)):
    """
    Verifica se o usuário logado tem privilégios de administrador.
    """
    if usuario_logado.get("nivel_acesso") != 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem realizar esta ação.",
        )
    return usuario_logado

#TODO: criar um refresh token para trabalhar com expirações de sessão e inatividade de tela
