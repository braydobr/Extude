from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.utils.auth_utils import obter_usuario_atual
from database.connection import get_db
from database import models
from sqlalchemy import func
import schemas
from routers.auth import verificar_admin

router = APIRouter(prefix="/admin", tags=["Admin"])

# ---- GERENCIAMENTO DE QUESTÕES ----


# Cadastrar Questão
@router.post("/cadastrar", response_model=schemas.QuestaoResponse)
def cadastrar_questao(
    questao: schemas.QuestaoCreate,
    db: Session = Depends(get_db),
    admin_logado: dict = Depends(verificar_admin),
):
    nova_questao = models.Questao(**questao.model_dump(), criado_por=admin_logado["id"])
    db.add(nova_questao)
    db.commit()
    db.refresh(nova_questao)
    return nova_questao


# Editar Questão
@router.put("/questoes/{questao_id}", response_model=schemas.QuestaoResponse)
def editar_questao(
    questao_id: int,
    dados_atualizados: schemas.QuestaoCreate,  # Reutiliza o schema de criação
    db: Session = Depends(get_db),
    admin_logado: dict = Depends(verificar_admin),
):
    questao = (
        db.query(models.Questao).filter(models.Questao.questao_id == questao_id).first()
    )

    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")

    # Atualiza os campos dinamicamente
    for key, value in dados_atualizados.model_dump().items():
        setattr(questao, key, value)

    db.commit()
    db.refresh(questao)
    return questao


# Excluir Questão
@router.delete("/questoes/{questao_id}", status_code=204)
def excluir_questao(
    questao_id: int,
    db: Session = Depends(get_db),
    admin_logado: dict = Depends(verificar_admin),
):
    questao = (
        db.query(models.Questao).filter(models.Questao.questao_id == questao_id).first()
    )

    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")

    db.delete(questao)
    db.commit()
    return None  # Status 204 não retorna corpo


# ---- GERENCIAMENTO DE USUÁRIOS ----


# Listar usuários
@router.get("/usuarios/listar")
def listar_usuarios(
    db: Session = Depends(get_db), admin_logado: dict = Depends(verificar_admin)
):
    # Retornamos os usuários, mas escondemos a senha por segurança
    usuarios = db.query(models.Usuario).all()
    return [
        {
            "id": u.usuario_id,
            "nome": u.nome,
            "email": u.email,
            "nivel": u.nivel_acesso,
            "cpf": u.cpf,
        }
        for u in usuarios
    ]


# Editar cadastro de usuários
@router.put("/usuarios/{aluno_id}")
def editar_usuario(
    aluno_id: int,
    dados_atualizados: schemas.UsuarioCreate,  # Usamos o schema de cadastro para validar os novos dados
    db: Session = Depends(get_db),
    admin_logado: dict = Depends(verificar_admin),
):
    usuario = (
        db.query(models.Usuario).filter(models.Usuario.usuario_id == aluno_id).first()
    )

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Atualiza campos como nome, email e nível de acesso
    usuario.nome = dados_atualizados.nome
    usuario.email = dados_atualizados.email
    usuario.nivel_acesso = dados_atualizados.nivel_acesso

    db.commit()
    db.refresh(usuario)

    return {"mensagem": "Usuário atualizado com sucesso!", "usuario": usuario.nome}


# Excluir cadastro de usuários
@router.delete("/usuarios/{aluno_id}", status_code=204)
def excluir_usuario(
    aluno_id: int,
    db: Session = Depends(get_db),
    admin_logado: dict = Depends(verificar_admin),
):
    usuario = (
        db.query(models.Usuario).filter(models.Usuario.usuario_id == aluno_id).first()
    )

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Remove o usuário (O banco de dados cuidará das relações se estiver configurado)
    db.delete(usuario)
    db.commit()

    return None


# Busca o desempenho de um usuário específico
@router.get(
    "/desempenho-usuario/{aluno_id}", response_model=schemas.EstatisticasUsuario
)
def inspecionar_desempenho_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    admin_logado: dict = Depends(verificar_admin),  # Trava de segurança
):
    # 1. Verifica se o usuário alvo existe
    aluno = (
        db.query(models.Usuario).filter(models.Usuario.usuario_id == aluno_id).first()
    )
    if not aluno:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # 2. Busca as estatísticas consolidada do aluno alvo
    stats = (
        db.query(models.Estatistica)
        .filter(models.Estatistica.usuario_id == aluno_id)
        .all()
    )

    total_respondidas = len(stats)
    total_acertos = sum(1 for s in stats if s.acertou)
    total_erros = total_respondidas - total_acertos
    taxa = (total_acertos / total_respondidas * 100) if total_respondidas > 0 else 0

    return {
        "total_respondidas": total_respondidas,
        "total_acertos": total_acertos,
        "total_erros": total_erros,
        "taxa_acerto": round(taxa, 2),
    }


# Lista o desempenho geral dos usuários do sistema
@router.get("/dashboard-geral")
def dashboard_geral(
    db: Session = Depends(get_db), admin_logado: dict = Depends(verificar_admin)
):
    # 1. Métricas de Volume
    total_usuarios = db.query(models.Usuario).count()
    total_questoes = db.query(models.Questao).count()

    # 2. JOIN para pegar todas as estatísticas de todos os usuários cruzadas com as disciplinas
    resultados = (
        db.query(models.Estatistica, models.Questao.disciplina)
        .join(
            models.Questao, models.Estatistica.questao_id == models.Questao.questao_id
        )
        .all()
    )

    total_respostas = len(resultados)
    total_acertos_global = sum(1 for stat, disc in resultados if stat.acertou)

    taxa_sucesso_global = (
        (total_acertos_global / total_respostas * 100) if total_respostas > 0 else 0
    )

    # 3. Cálculo de Engajamento por Disciplina (Global)
    acertos_disc = {
        "Português": 0,
        "Matemática": 0,
        "História": 0,
        "Geografia": 0,
        "Inglês": 0,
    }
    total_disc = {
        "Português": 0,
        "Matemática": 0,
        "História": 0,
        "Geografia": 0,
        "Inglês": 0,
    }

    for stat, disciplina in resultados:
        if disciplina in total_disc:
            total_disc[disciplina] += 1
            if stat.acertou:
                acertos_disc[disciplina] += 1

    engajamento = {
        "portugues": (
            round((acertos_disc["Português"] / total_disc["Português"] * 100))
            if total_disc["Português"] > 0
            else 0
        ),
        "matematica": (
            round((acertos_disc["Matemática"] / total_disc["Matemática"] * 100))
            if total_disc["Matemática"] > 0
            else 0
        ),
        "historia": (
            round((acertos_disc["História"] / total_disc["História"] * 100))
            if total_disc["História"] > 0
            else 0
        ),
        "geografia": (
            round((acertos_disc["Geografia"] / total_disc["Geografia"] * 100))
            if total_disc["Geografia"] > 0
            else 0
        ),
        "ingles": (
            round((acertos_disc["Inglês"] / total_disc["Inglês"] * 100))
            if total_disc["Inglês"] > 0
            else 0
        ),
    }

    return {
        "metricas_plataforma": {
            "usuarios_cadastrados": total_usuarios,
            "questoes_no_banco": total_questoes,
            "total_de_respostas_recebidas": total_respostas,
        },
        "performance_geral": {"taxa_de_acerto_media": round(taxa_sucesso_global, 2)},
        "engajamento": engajamento,
    }


# Rota pública: O painel do aluno vai chamar essa rota para saber a data
@router.get("/api/configuracoes/alerta-esa")
def obter_alerta_esa(db: Session = Depends(get_db)):
    config = (
        db.query(models.Configuracao)
        .filter(models.Configuracao.chave == "data_prova_esa")
        .first()
    )
    if not config or not config.valor:
        return {"data_prova": None}
    return {"data_prova": config.valor}


# ... final do arquivo admin.py ...


@router.post("/configuracoes/alerta-esa")
def atualizar_alerta_esa(
    data_prova: str,
    db: Session = Depends(get_db),
    admin_logado: dict = Depends(verificar_admin),
):
    config = (
        db.query(models.Configuracao)
        .filter(models.Configuracao.chave == "data_prova_esa")
        .first()
    )

    if not config:
        config = models.Configuracao(chave="data_prova_esa", valor=data_prova)
        db.add(config)
    else:
        config.valor = data_prova

    db.commit()
    return {"mensagem": "Data da prova atualizada com sucesso!"}


@router.get("/dashboard-estatisticas")
def obter_dados_relatorio_geral(
    db: Session = Depends(get_db),
    usuario_logado: dict = Depends(obter_usuario_atual)
):
    # 1. Busca o usuário no banco de dados usando o ID salvo no token
    usuario_banco = db.query(models.Usuario).filter(models.Usuario.usuario_id == usuario_logado["id"]).first()

    if not usuario_banco or usuario_banco.nivel_acesso != 0:
        raise HTTPException(status_code=403, detail="Acesso negado. Privilégios administrativos exigidos.")

    total_alunos = db.query(models.Usuario).filter(models.Usuario.nivel_acesso == 1).count()
    
    # Métricas de Infraestrutura Geral
    total_alunos = db.query(models.Usuario).filter(models.Usuario.nivel_acesso == 0).count()
    total_questoes = db.query(models.Questao).count()
    volumetria_respostas = db.query(func.sum(models.Estatistica.tentativas)).scalar() or 0
    
    total_acertos = db.query(models.Estatistica).filter(models.Estatistica.acertou == True).count()
    taxa_global = round((total_acertos / volumetria_respostas * 100), 2) if volumetria_respostas > 0 else 0

    # Desempenho por Disciplina
    query_disciplinas = db.query(
        models.Questao.disciplina,
        func.sum(models.Estatistica.tentativas).label("total_tentativas"),
        func.sum(func.cast(models.Estatistica.acertou, models.Integer)).label("total_acertos")
    ).join(models.Estatistica, models.Estatistica.questao_id == models.Questao.questao_id).group_by(models.Questao.disciplina).all()

    relatorio_materias = []
    for disc, tent, acert in query_disciplinas:
        t = tent or 0
        a = acert or 0
        taxa = round((a / t * 100), 1) if t > 0 else 0
        relatorio_materias.append({
            "disciplina": disc, 
            "tentativas": t, 
            "taxa_acerto": f"{taxa}%"
        })

    # Ranking dos Alunos (Top 5 com mais acertos)
    query_ranking = db.query(
        models.Usuario.nome,
        models.Usuario.email,
        func.sum(func.cast(models.Estatistica.acertou, models.Integer)).label("acertos")
    ).join(models.Estatistica, models.Estatistica.usuario_id == models.Usuario.usuario_id).group_by(models.Usuario.usuario_id).order_by(func.sum(func.cast(models.Estatistica.acertou, models.Integer)).desc()).limit(5).all()

    ranking_alunos = [[u.nome, u.email, str(u.acertos)] for u in query_ranking]

    return {
        "resumo": {
            "alunos": total_alunos,
            "questoes": total_questoes,
            "interacoes": volumetria_respostas,
            "assertividade_geral": f"{taxa_global}%"
        },
        "materias": relatorio_materias,
        "ranking": ranking_alunos
    }