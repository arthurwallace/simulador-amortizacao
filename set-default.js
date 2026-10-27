import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const inputFile = args[0];

if (!inputFile) {
  console.log('Uso: node set-default.js <caminho-para-o-arquivo.json>');
  console.log('Exemplo: node set-default.js meu_novo_cenario.json');
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), inputFile);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Erro: Arquivo não encontrado: ${resolvedPath}`);
  process.exit(1);
}

try {
  const content = fs.readFileSync(resolvedPath, 'utf-8');
  let data = JSON.parse(content);

  // If data is a dictionary of scenarios, extract the first one
  if (!data.loanAmount && typeof data === 'object') {
    const firstKey = Object.keys(data)[0];
    if (firstKey && data[firstKey]?.loanAmount) {
      console.log(`Extraindo cenário "${firstKey}" do arquivo.`);
      data = data[firstKey];
    }
  }

  if (typeof data.loanAmount !== 'number' || !Array.isArray(data.plans)) {
    console.error('Erro: O JSON fornecido não contém uma estrutura válida de cenário de amortização (loanAmount e plans).');
    process.exit(1);
  }

  data.updatedAt = new Date().toISOString();

  const targetPath = path.resolve(process.cwd(), 'default-scenario.json');
  fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ default-scenario.json atualizado com sucesso!');

  // Ask to commit and push
  if (args.includes('--push') || args.includes('-p')) {
    console.log('Enviando para o GitHub...');
    execSync('git add default-scenario.json');
    execSync('git commit -m "chore: atualizar cenario padrao global"');
    execSync('git push');
    console.log('🚀 Atualização enviada ao GitHub! O Cloudflare Pages atualizará automaticamente para todos os visitantes.');
  } else {
    console.log('\nPara publicar para todos os visitantes na Cloudflare, execute:');
    console.log('git add default-scenario.json');
    console.log('git commit -m "atualizar cenario padrao"');
    console.log('git push\n');
  }
} catch (err) {
  console.error('Erro ao processar JSON:', err.message);
  process.exit(1);
}
