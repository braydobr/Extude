import datetime
from datetime import timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# CONFIGURAÇÕES
##TODO: colocar dados sensiveis numa .env
SECRET_KEY = "chave_bem_secreta_e_super_dificil_2026_atualizado"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# --- SENHAS ---


def gerar_hash_senha(senha: str):
    return pwd_context.hash(senha)


def verificar_senha(senha_puro_texto, senha_criptografada):
    return pwd_context.verify(senha_puro_texto, senha_criptografada)


# --- TOKENS (SESSÃO) ---


def criar_token_acesso(dados: dict):
    """Gera o JWT com tempo de expiração."""
    para_codificar = dados.copy()

    # Define a expiração usando o tempo atual em UTC + os minutos definidos
    expiracao = datetime.datetime.now(timezone.utc) + datetime.timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    # O campo 'exp' é o padrão do JWT para expiração automática
    para_codificar.update({"exp": expiracao})

    token_jwt = jwt.encode(para_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return token_jwt


def decodificar_token(token: str):
    """
    Tenta ler o token. Se o tempo 'exp' tiver passado,
    o 'jwt.decode' lança um JWTError automaticamente.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        # Se o token for inválido, malformado ou EXPIRADO, cai aqui
        return None


# --- DEPENDÊNCIAS ---


def obter_usuario_atual(token: str = Depends(oauth2_scheme)):
    """
    Dependência usada nas rotas para validar se o usuário está logado.
    Se o token expirou, o usuário recebe um erro 401.
    """
    payload = decodificar_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão expirada. Por favor, faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
