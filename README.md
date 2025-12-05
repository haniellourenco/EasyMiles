# ✈️ EasyMiles

![Status](https://img.shields.io/static/v1?label=STATUS&message=EM%20DESENVOLVIMENTO&color=GREEN&style=for-the-badge)
![Angular](https://img.shields.io/badge/angular-%23DD0031.svg?style=for-the-badge&logo=angular&logoColor=white)
![Django](https://img.shields.io/badge/django-%23092E20.svg?style=for-the-badge&logo=django&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Azure](https://img.shields.io/badge/azure-%230072C6.svg?style=for-the-badge&logo=microsoftazure&logoColor=white)

> **Simplificando o controle de milhas para viajantes frequentes.**

---

## 📋 Sobre o Projeto

O **EasyMiles** é uma aplicação web desenvolvida para auxiliar pessoas físicas na gestão estratégica de pontos e milhas aéreas acumuladas em diferentes programas de fidelidade.

A solução substitui o controle manual (geralmente feito em planilhas complexas e propensas a erros) por um sistema centralizado que automatiza cálculos financeiros essenciais, como o **Custo Médio do Milheiro (CPM)**, permitindo que o usuário tome decisões baseadas em dados sobre compra, venda e transferência bonificada.

Projeto desenvolvido como parte da disciplina de **Engenharia de Software** do Centro Universitário Católica de Santa Catarina.

O projeto pode ser acessado em produção através do link [easymiles.com.br](https://www.easymiles.com.br/) e utilizado um usuário de teste com dados cujo login e senha é **teste123**

## 🎯 Problema Resolvido

Viajantes e acumuladores de milhas enfrentam dificuldades em:

1.  **Centralização:** Dados dispersos em múltiplos programas (Smiles, Latam, Livelo, etc.).
2.  **Precificação:** Dificuldade em calcular o custo real de aquisição das milhas para saber se uma venda ou resgate vale a pena.
3.  **Rastreabilidade:** Falta de histórico consolidado de movimentações e lucros.

## 🚀 Funcionalidades

- **Autenticação Segura:** Login e cadastro de usuários (JWT).
- **Gestão de Carteiras:** Cadastro e administração de contas em múltiplos programas de fidelidade.
- **Controle de Transações:** Registro de entradas (compras, bônus) e saídas (vendas, expirações, resgates).
- **Cálculo Automático de Custo:** O sistema recalcula automaticamente o Custo Médio (CPM) a cada nova aquisição.
- **Dashboard Financeiro:**
  - Patrimônio total estimado em milhas.
  - Lucro/Prejuízo realizado.
  - Distribuição da carteira por programa.

## 🎨 Layout

| Dashboard                                                                | Programas de Fidelidade                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| ![Dashboard](https://image.prntscr.com/image/iuaS2Hv1QomROhXWQJMxQw.png) | ![Programas](https://image.prntscr.com/image/ShBXJbkjTxiAkMchFBoL_A.png) |

## 🛠️ Tecnologias Utilizadas

### Frontend

- **Framework:** Angular v19
- **UI Kit:** NG-ZORRO (Ant Design)
- **Linguagem:** TypeScript
- **Testes:** Jasmine + Karma

### Backend

- **Framework:** Django 5.2 + Django REST Framework (DRF)
- **Linguagem:** Python 3.11
- **Autenticação:** Simple JWT
- **Testes:** Pytest + Coverage

### Infraestrutura & DevOps

- **Banco de Dados:** PostgreSQL 16
- **Containerização:** Docker e Docker Compose
- **Cloud Provider:** Microsoft Azure (Static Web Apps, App Service, Database)
- **CI/CD:** GitHub Actions (Pipelines automatizados de Build, Test e Deploy)
- **Qualidade:** SonarCloud (Análise estática e cobertura de código)
- **Monitoramento:** Azure Application Insights e Azure Monitor

## 🔧 Como Executar o Projeto

### Pré-requisitos

- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados.
- [Node.js](https://nodejs.org/) v18+
- Git.

### Passo a Passo

1.  **Clone o repositório**

    ```bash
    git clone https://github.com/haniellourenco/EasyMiles.git
    cd EasyMiles
    ```

2.  **Configuração do Backend (Docker)**
    O backend e o banco de dados sobem via Docker Compose.

    Crie um arquivo `.env` dentro da pasta `backend/` com as seguintes configurações:

    ```
    SECRET_KEY=secret-key-dev
    ALLOWED_HOSTS=localhost,127.0.0.1,web
    CORS_ALLOWED_ORIGINS=http://localhost:4200
    DB_NAME=easymiles-dev
    DB_USER=local_user
    DB_PASSWORD=local_password
    DB_HOST=db
    DB_PORT=5432
    ```

    Em seguida, suba o container:

    ```bash
    cd backend
    docker compose up --build
    ```

    _O backend estará disponível em: `http://localhost:8000/api`_

3.  **Execução do Frontend**
    Em um novo terminal:

    ```bash
    cd frontend
    npm install
    npm start
    ```

    _O frontend estará disponível em: `http://localhost:4200`_

# Autor

| [<img loading="lazy" src="https://avatars.githubusercontent.com/u/62188157?s=400&u=0e53a5920716e15287e031c605f864444a9ca8ee&v=4" width=115><br><sub>Haniel Lourenço Lohn</sub>](https://github.com/haniellourenco)
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
