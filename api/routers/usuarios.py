from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database.connection import get_db
from database import models
import schemas
from utils.auth_utils import gerar_hash_senha, obter_usuario_atual
from utils.auth_utils import pwd_context, verificar_senha, obter_usuario_atual

router = APIRouter(prefix="/usuarios", tags=["Usuários"])


# Cadastrar usuário


@router.post("/cadastrar", response_model=schemas.UsuarioResponse)
def cadastrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    # 1. Verificar preventivamente se o cpf ou email já existe
    usuario_existente = (
        db.query(models.Usuario)
        .filter(
            (models.Usuario.cpf == usuario.cpf)
            | (models.Usuario.email == usuario.email)
        )
        .first()
    )

    if usuario_existente:
        msg = "CPF" if usuario_existente.cpf == usuario.cpf else "E-mail"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Este {msg} já está cadastrado!",
        )

    # 2. Criptografar a senha
    hash_da_senha = gerar_hash_senha(usuario.senha)

    # 3. Criar o objeto do banco
    novo_usuario = models.Usuario(
        nome=usuario.nome,
        email=usuario.email,
        cpf=usuario.cpf,
        senha=hash_da_senha,
        nivel_acesso=usuario.nivel_acesso,
        meta=usuario.meta,
    )

    try:
        db.add(novo_usuario)  # Adiciona à sessão
        db.commit()  # Salva no arquivo .db
        db.refresh(novo_usuario)
        return novo_usuario

    except IntegrityError:
        # Se por qualquer motivo de concorrência ou sessão o 'if' falhar e o banco barrar,
        # o rollback desfaz a transação pendente e limpa a sessão do SQLAlchemy.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro de integridade: CPF ou E-mail já constam no sistema.",
        )


# Visualizar dados do próprio cadastro


@router.get("/perfil")
def obter_meu_perfil(
    db: Session = Depends(get_db), usuario_logado: dict = Depends(obter_usuario_atual)
):

    # 1. Usamos o ID do token para buscar o usuário no banco de dados
    usuario = (
        db.query(models.Usuario)
        .filter(
            models.Usuario.usuario_id == usuario_logado["id"]
        )  # Atenção: verifique se no seu models.py a coluna se chama 'id' ou 'usuario_id'
        .first()
    )

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # 2. Retornamos os dados extraídos do BANCO DE DADOS (usuario.nome), e não do token
    return {"nome": usuario.nome, "email": usuario.email}


# Editar o próprio cadastro


# Rota para o frontend buscar os dados atuais ao carregar a página
@router.get("/perfil")
def ver_meu_perfil(
    db: Session = Depends(get_db), usuario_logado: dict = Depends(obter_usuario_atual)
):
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.usuario_id == usuario_logado["id"])
        .first()
    )

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    return {"nome": usuario.nome, "email": usuario.email}


# Rota atualizada para usar o UsuarioUpdate
@router.put("/perfil/editar")
def editar_meu_perfil(
    dados_atualizados: schemas.UsuarioUpdate,  # <-- Trocado para UsuarioUpdate
    db: Session = Depends(get_db),
    usuario_logado: dict = Depends(obter_usuario_atual),
):
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.usuario_id == usuario_logado["id"])
        .first()
    )

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    usuario.nome = dados_atualizados.nome
    usuario.email = dados_atualizados.email

    db.commit()
    db.refresh(usuario)

    return {"mensagem": "Dados atualizados com sucesso!", "nome": usuario.nome}


# Exclusão de cadastro do próprio usuário


# Rota atualizada no usuarios.py


@router.delete("/perfil/excluir-conta", status_code=status.HTTP_204_NO_CONTENT)
def excluir_propria_conta(
    dados: schemas.ExcluirContaRequest,  # <- Agora exige o esquema com a senha
    db: Session = Depends(get_db),
    usuario_logado: dict = Depends(obter_usuario_atual),
):
    # 1. Busca o usuário no banco usando o ID do token
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.usuario_id == usuario_logado["id"])
        .first()
    )

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # 2. VERIFICAÇÃO DE SEGURANÇA: Checa se a senha digitada bate com a do banco
    if not verificar_senha(dados.senha, usuario.senha):
        raise HTTPException(
            status_code=401, detail="Senha incorreta. Não foi possível excluir a conta."
        )

    # 3. Remove o usuário se a senha estiver correta
    db.delete(usuario)
    db.commit()

    return None


# Obeter desempenho individual do usuário logado


@router.get("/meu-desempenho", response_model=schemas.EstatisticasUsuario)
def obter_meu_desempenho(
    db: Session = Depends(get_db), usuario_logado: dict = Depends(obter_usuario_atual)
):
    # 1. Fazemos um JOIN entre Estatistica e Questao para ter os acertos e a disciplina juntos
    resultados = (
        db.query(models.Estatistica, models.Questao.disciplina)
        .join(
            models.Questao, models.Estatistica.questao_id == models.Questao.questao_id
        )
        .filter(models.Estatistica.usuario_id == usuario_logado["id"])
        .all()
    )

    total_respondidas = len(resultados)
    total_acertos = 0

    # Dicionários temporários para contar as métricas de cada disciplina
    acertos_por_disciplina = {
        "Português": 0,
        "Matemática": 0,
        "História": 0,
        "Geografia": 0,
        "Inglês": 0,
    }
    total_por_disciplina = {
        "Português": 0,
        "Matemática": 0,
        "História": 0,
        "Geografia": 0,
        "Inglês": 0,
    }

    # 2. Percorre todas as respostas do aluno fazendo a contagem real
    for stat, disciplina in resultados:
        # Adiciona a disciplina no dict caso tenha um nome diferente no banco
        if disciplina not in total_por_disciplina:
            total_por_disciplina[disciplina] = 0
            acertos_por_disciplina[disciplina] = 0

        total_por_disciplina[disciplina] += 1

        if stat.acertou:
            total_acertos += 1
            acertos_por_disciplina[disciplina] += 1

    total_erros = total_respondidas - total_acertos
    taxa_geral = (
        (total_acertos / total_respondidas * 100) if total_respondidas > 0 else 0
    )

    # 3. Calcula a porcentagem matemática de acerto/conclusão de cada matéria
    engajamento = {}
    for disc in total_por_disciplina.keys():
        if total_por_disciplina[disc] > 0:
            engajamento[disc] = round(
                (acertos_por_disciplina[disc] / total_por_disciplina[disc]) * 100
            )
        else:
            engajamento[disc] = 0

    # 4. Formata o objeto final exatamente com as chaves que o nosso JavaScript está esperando
    engajamento_formatado = {
        "portugues": engajamento.get("Português", 0),
        "matematica": engajamento.get("Matemática", 0),
        "historia": engajamento.get("História", 0),
        "geografia": engajamento.get("Geografia", 0),
        "ingles": engajamento.get("Inglês", 0),
    }

    return {
        "total_respondidas": total_respondidas,
        "total_acertos": total_acertos,
        "total_erros": total_erros,
        "taxa_acerto": round(taxa_geral, 2),
        "engajamento": engajamento_formatado,
    }


# Rota verificar se o CPF existe


@router.get("/verificar-cpf/{cpf}")
def verificar_cpf(cpf: str, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.cpf == cpf).first()
    if not usuario:
        return {"existe": False}
    return {"existe": True, "email": usuario.email}


# Rota para redefinir senha esquecida (Deslogado - usa o CPF)
@router.post("/redefinir-senha-esquecida")
def redefinir_senha_esquecida(
    dados: schemas.RedefinirSenhaEsquecida, db: Session = Depends(get_db)
):
    usuario = db.query(models.Usuario).filter(models.Usuario.cpf == dados.cpf).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Criptografa a nova senha usando a função que você já importou no topo do arquivo
    usuario.senha = gerar_hash_senha(dados.nova_senha)
    db.commit()

    return {"mensagem": "Senha redefinida com sucesso!"}


# Rota para redefinir senha sem exigir a antiga (Logado - usa o Token)
@router.put("/perfil/redefinir-senha-token")
def redefinir_senha_token(
    dados: schemas.RedefinirSenhaLogado,
    db: Session = Depends(get_db),
    usuario_logado: dict = Depends(obter_usuario_atual),
):
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.usuario_id == usuario_logado["id"])
        .first()
    )

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    usuario.senha = gerar_hash_senha(dados.nova_senha)
    db.commit()

    return {"mensagem": "Senha redefinida com sucesso!"}
