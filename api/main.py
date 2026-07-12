from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api.database.connection import engine, Base
import api.database.models as models
import sys
import os

# Garante que o Python encontre os módulos dentro da pasta api
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.routers import usuarios, auth, questoes, admin

# Cria as tabelas no banco de dados
Base.metadata.create_all(bind=engine)

app = FastAPI()

# ====================================================
# CONFIGURAÇÃO DE ARQUIVOS ESTÁTICOS
# ====================================================
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

# ====================================================
# ROTAS PARA SERVIR O FRONTEND (HTML)
# ====================================================


# Rota para a raiz - Abre o login por padrão
@app.get("/")
async def read_index():
    return FileResponse("login.html")


# Rota dinâmica: serve qualquer arquivo .html automaticamente
@app.get("/{nome_pagina}.html")
async def servir_paginas(nome_pagina: str):
    caminho = f"{nome_pagina}.html"
    if os.path.exists(caminho):
        # Cria cabeçalhos forçando o navegador a nunca usar o cache
        headers = {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
        return FileResponse(caminho, headers=headers)
    raise HTTPException(status_code=404, detail="Página não encontrada")


# ====================================================
# MIDDLEWARES E ROUTERS
# ====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:8000",
        "http://127.0.0.1",
        "http://127.0.0.1:8000",
    ],
    # Permite qualquer domínio gerado pelo ngrok
    allow_origin_regex=r"https://.*\.ngrok-free\.(app|dev)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(auth.router)
app.include_router(questoes.router)
app.include_router(admin.router)


@app.get("/sw.js", include_in_schema=False)
async def serve_sw():
    caminho_sw = "assets/sw.js"
    if os.path.exists(caminho_sw):
        return FileResponse(caminho_sw, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="Service Worker não encontrado")