/**
 * Cloudflare Pages & Workers Entrypoint (_worker.js)
 * Permite que a Cloudflare reconheça o projeto como dinâmico (habilita Bindings como KV/D1)
 * ao mesmo tempo que serve os arquivos estáticos (HTML/CSS/JS).
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Rota da API de Sincronização
    if (url.pathname === '/api/sync' || url.pathname === '/api/sync/') {
      return handleSyncRequest(request, env);
    }

    // Para qualquer outra rota, entrega os arquivos estáticos da página
    return env.ASSETS.fetch(request);
  }
};

async function handleSyncRequest(request, env) {
  const origin = request.headers.get('Origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-sync-pin, x-sync-secret',
    'Access-Control-Max-Age': '86400',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Verificação de Chave de Acesso / PIN (se configurada)
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
      error: 'KV Namespace não vinculado. Vincule o namespace como "AMORT_KV" no painel da Cloudflare.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const STORAGE_KEY = 'user_amort_sync_state';

  try {
    if (request.method === 'GET') {
      const data = await kv.get(STORAGE_KEY, 'json');
      return new Response(JSON.stringify({
        success: true,
        data: data || null,
        updatedAt: data?.updatedAt || null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

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
        message: 'Dados sincronizados com sucesso na Cloudflare!',
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

