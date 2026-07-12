from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from database import models
import schemas
from utils.auth_utils import obter_usuario_atual
import datetime

router = APIRouter(prefix="/questoes", tags=["Questões"])


# Função para listar questões
@router.get("/listar")
def listar_todas_as_questoes(
    db: Session = Depends(get_db),
    usuario_logado: dict = Depends(obter_usuario_atual),  # Qualquer um logado vê
):
    return db.query(models.Questao).all()

# Buscar questões por id
@router.get("/{questao_id}", response_model=schemas.QuestaoResponse)
def buscar_questao_por_id(
    questao_id: int,
    db: Session = Depends(get_db)
):
    questao = db.query(models.Questao).filter(models.Questao.questao_id == questao_id).first()
    
    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
        
    return questao

# Função para Responder as questções
@router.post("/responder")
def responder_questao(
    dados: schemas.RespostaQuestao,
    db: Session = Depends(get_db),
    usuario_logado: dict = Depends(obter_usuario_atual),
):
    # 1. Busca a questão no banco
    questao = (
        db.query(models.Questao)
        .filter(models.Questao.questao_id == dados.questao_id)
        .first()
    )

    if not questao:
        raise HTTPException(status_code=404, detail="Questão não encontrada")

    # 2. Verifica se a resposta está correta
    # Usamos .upper() para evitar erro se o usuário mandar "a" em vez de "A"
    acertou = questao.resposta.upper() == dados.alternativa_escolhida.upper()

    # 3. Atualizar ou Criar a ESTATÍSTICA (Consolidado por questão)
    estatistica = (
        db.query(models.Estatistica)
        .filter(
            models.Estatistica.usuario_id == usuario_logado["id"],
            models.Estatistica.questao_id == dados.questao_id,
        )
        .first()
    )

    if estatistica:
        # Se já respondeu essa questão antes, atualiza
        estatistica.tentativas += 1
        estatistica.acertou = acertou
        # Mantém a coerência com o fuso GMT-3 do restante do sistema
        estatistica.data = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    else:
        # Se é a primeira vez, cria o registro
        nova_stats = models.Estatistica(
            usuario_id=usuario_logado["id"],
            questao_id=dados.questao_id,
            acertou=acertou,
            tentativas=1,
        )
        db.add(nova_stats)

    db.commit()

    # 4. Retorno para o usuário
    return {
        "correto": acertou,
        "mensagem": "Parabéns, você acertou!" if acertou else "Resposta incorreta.",
        "gabarito": questao.resposta if not acertou else None,
        "explicação": questao.explicacao,
    }