/**
 * Cloudflare Pages Function: /api/sync
 * Sincronização multi-dispositivo do Simulador de Amortização
 * 
 * Configurações no painel do Cloudflare Pages:
 * 1. Storage: Criar um KV Namespace (ex: "AMORT_KV") e vinculá-lo em
 *    Settings -> Functions -> KV namespace bindings com a variável: AMORT_KV
 * 2. Segurança (Recomendado): Em Settings -> Environment variables,
 *    adicionar a variável: SYNC_PIN (ou SYNC_SECRET) com sua senha/PIN de acesso.
 */

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';

  // Cabeçalhos CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-sync-pin, x-sync-secret',
    'Access-Control-Max-Age': '86400',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Verificação de Chave de Acesso / PIN (se configurada no Cloudflare)
  const configuredSecret = env.SYNC_PIN || env.SYNC_SECRET;
  if (configuredSecret) {
    const clientPin = request.headers.get('x-sync-pin') || request.headers.get('x-sync-secret');
    if (!clientPin || clientPin.trim() !== configuredSecret.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Chave de Acesso / PIN inválida. Verifique o PIN configurado no simulador.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // 2. Acesso ao Storage KV da Cloudflare
  const kv = env.AMORT_KV || env.KV;
  if (!kv) {
    return new Response(JSON.stringify({
      success: false,
      error: 'KV Namespace não vinculado no Cloudflare Pages. Crie um KV Namespace e vincule como "AMORT_KV" em Settings -> Functions -> KV namespace bindings.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const STORAGE_KEY = 'user_amort_sync_state';

  try {
    // GET: Baixar dados atualizados da nuvem
    if (request.method === 'GET') {
      const data = await kv.get(STORAGE_KEY, 'json');
      if (!data) {
        return new Response(JSON.stringify({
          success: true,
          data: null,
          message: 'Nenhum dado salvo na nuvem ainda. Realize a primeira sincronização enviando os dados deste dispositivo.'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: data,
        updatedAt: data.updatedAt || null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // POST: Gravar dados na nuvem
    if (request.method === 'POST') {
      const payload = await request.json();
      if (!payload || typeof payload !== 'object') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Dados de sincronização inválidos.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const toSave = {
        ...payload,
        updatedAt: new Date().toISOString()
      };

      await kv.put(STORAGE_KEY, JSON.stringify(toSave));

      return new Response(JSON.stringify({
        success: true,
        message: 'Dados sincronizados com sucesso na nuvem Cloudflare!',
        updatedAt: toSave.updatedAt
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno ao processar sincronização: ' + err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

