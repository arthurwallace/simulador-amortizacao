# Simulador de Amortização de Financiamento (SAC e Price)

Aplicação web estática, moderna e ultraleve para simulação e planejamento de amortizações extras em financiamentos imobiliários (Tabela SAC e Tabela Price).

Projetada especialmente para publicação imediata no **Cloudflare Pages** (ou Vercel/Netlify/GitHub Pages).

---

## 🚀 Principais Características

- **📋 Acompanhamento Real do Financiamento & Extrato Oficial**:
  - Registre cada amortização extra e cada parcela paga no dia a dia.
  - Painel com KPIs em tempo real: Saldo devedor real hoje, total amortizado (regular vs extras), total desembolsado ao banco e parcelas restantes.
  - Edite ou exclua qualquer lançamento com recálculo automático de todo o histórico.
- **⚡ Cálculo Preciso de Juros Pró-rata e TR Intra-mês**:
  - Replicada a metodologia bancária oficial (modelo Itaú / SAC): quando você amortiza ao longo do mês (fora do dia de vencimento), o sistema calcula os dias decorridos no ciclo e estima os juros pró-rata e atualização monetária proporcional.
  - Permite ajuste fino dos centavos diretamente no lançamento.
- **📄 Leitor Automático de PDF (DDC Itaú / Extratos Bancários)**:
  - Faça o upload do arquivo PDF do Demonstrativo Descritivo de Crédito (DDC) do seu banco.
  - Extração automática no próprio navegador (100% privado, sem enviar para servidores externos): lê número do contrato, parcelas pagas, novas amortizações realizadas e encargos.
- **🔍 Reconciliação & Análise de Divergências**:
  - Compara os dados do extrato PDF com o que está cadastrado no sistema.
  - Mostra tela comparativa lado a lado e permite escolher item por item: atualizar com os dados do arquivo PDF ou manter os dados manuais.
- **Mesma API Oficial & Motor Local Resiliente**: Conecta-se diretamente aos serviços da API do `simuladoramortizacao.com.br` com suporte a cálculo resiliente local de contingência (caso a rede esteja indisponível).
- **Sem Telefone e Sem E-mail**: Removida qualquer barreira de captura de dados ou pop-ups de cadastro. Total privacidade.
- **Armazenamento e Acesso Futuro**:
  - Salva automaticamente todos os dados, histórico real e amortizações configuradas no `localStorage`.
  - **Gerenciador de Cenários**: Salve múltiplos cenários e exporte/importe backups completos em JSON.
- **Exportação e Impressão**:
  - Download instantâneo de planilha CSV do extrato real e das parcelas projetadas.
  - Layout otimizado para impressão/PDF (`Ctrl + P`).
- **Design Moderno e Responsivo**:
  - Modo Escuro (Dark Mode) e Modo Claro.
  - Visual elegante em celulares, tablets e computadores.

---

## 📦 Como Subir no Cloudflare Pages

### Método 1: Arrastar e Soltar (Mais Rápido - 1 minuto)
1. Acesse o painel da [Cloudflare](https://dash.cloudflare.com/) e vá em **Workers & Pages** > **Create application** > **Pages** > **Upload assets**.
2. Dê um nome ao seu projeto (ex: `meu-simulador-amortizacao`).
3. Arraste todos os arquivos desta pasta:
   - `index.html`
   - `app.js`
   - `styles.css`
   - `favicon.svg`
   - Pasta `img/`
4. Clique em **Deploy site**. Pronto! Seu simulador estará online com HTTPS gratuito e CDN global da Cloudflare.

### Método 2: Via Git (GitHub / GitLab)
1. Suba este repositório para o seu GitHub.
2. No painel Cloudflare Pages, selecione **Connect to Git** e escolha o repositório.
3. Configure os parâmetros de Build:
   - **Framework preset**: `None`
   - **Build command**: *(deixe em branco)*
   - **Build output directory**: `.` *(ou deixe em branco / raiz)*
4. Clique em **Save and Deploy**. A cada `git push`, seu site atualizará automaticamente.

---

## 🌐 Como Definir o Cenário Padrão Global (Para Todos que Acessarem)

O simulador carrega automaticamente as configurações e amortizações definidas no arquivo estático **`default-scenario.json`**. Quando um novo padrão é publicado, qualquer visitante (novo ou recorrente) passa a carregar esse cenário automaticamente.

Existem duas formas fáceis de importar um JSON e torná-lo o padrão de todos:

### Opção A: Diretamente pela Interface Web
1. Abra o simulador no navegador.
2. Clique no botão **Meus Cenários** no topo da página.
3. Na seção azul **"🌐 Padrão Global do Site"**, clique em **Importar JSON e Virar Padrão Global** e selecione o seu arquivo `.json`.
4. O simulador atualizará a tela e baixará automaticamente o novo `default-scenario.json`.
5. Substitua o `default-scenario.json` na raiz da pasta e envie para o GitHub:
   ```bash
   git add default-scenario.json
   git commit -m "chore: atualizar cenario padrao global"
   git push
   ```
6. O Cloudflare Pages recompilará e o novo cenário será o padrão para o mundo todo!

### Opção B: Via Terminal (Comando Único)
Você também pode usar o utilitário incluído `set-default.js`:
```bash
# Apenas atualiza o arquivo localmente:
node set-default.js caminho/para/meu-cenario.json

# Atualiza, comita e envia direto para o GitHub:
node set-default.js caminho/para/meu-cenario.json --push
```

---

## 🛠️ Testando Localmente

Para rodar em sua máquina:
```bash
# Com Python 3:
python -m http.server 8080

# Ou com Node.js:
npx serve .
```
Acesse `http://localhost:8080` no seu navegador.
