/* ═══════════════════════════════════════════════════════
   AVERO WEB — proxy Claude pour le chatbot du site vitrine.

   Tourne sur Cloudflare Workers (offre gratuite). La clé API
   Anthropic reste ici, en secret côté serveur — jamais dans
   le site. Le site (averoweb.fr) POSTe la conversation, ce
   Worker interroge Claude et renvoie la réponse.

   ── DÉPLOIEMENT (une seule fois) ─────────────────────────
   1. dash.cloudflare.com → Workers & Pages → Create → Worker
      → Deploy (un worker vide), puis « Edit code ».
   2. Coller ce fichier entier, cliquer « Deploy ».
   3. Onglet Settings → Variables and Secrets → + Add :
        Type : Secret
        Name : ANTHROPIC_API_KEY
        Value: sk-ant-...    (ta clé)
      → Deploy.
   4. Copier l'URL du worker (https://xxxxx.workers.dev) et la
      coller dans js/main.js → var AI_ENDPOINT = '...'.
   5. (recommandé) Settings → Rate limiting → ajouter une règle
      (ex. 20 requêtes / 10 min / IP) pour limiter les abus.

   Modèle : « claude-opus-5 » par défaut. Pour une FAQ de site
   vitrine, « claude-haiku-4-5 » suffit très largement et coûte
   ~5× moins cher — il suffit de changer MODEL ci-dessous.
   ═══════════════════════════════════════════════════════ */

const ALLOWED_ORIGIN = 'https://averoweb.fr';
const MODEL       = 'claude-opus-5';   // FAQ vitrine → 'claude-haiku-4-5' recommandé
const MAX_TOKENS  = 1024;              // réponses courtes
const MAX_MESSAGES = 20;
const MAX_CHARS    = 12000;

const SYSTEM_PROMPT = `Tu es l'assistant du studio web Avero Web (Rodez et Millau, Aveyron). Tu réponds aux visiteurs du site averoweb.fr, en français, avec vouvoiement, ton chaleureux et sans jargon. Réponses courtes : 2 à 4 phrases, en texte simple (pas de listes à puces, pas de Markdown).

OFFRES
- Essentiel : 1 000 € HT — jusqu'à 5 pages, design personnalisé, mobile et tablette, formulaire de contact, fiche Google Business. Livré en 3 semaines.
- Premium : 2 600 € HT — jusqu'à 10 pages, animations, rédaction des pages clés, blog ou actualités, référencement local renforcé. Livré en 4 semaines.
- E-commerce : 1 500 à 5 000 € HT selon le catalogue — tout « Premium » plus catalogue, stocks, paiement CB sécurisé, transporteurs, click & collect, factures automatiques, formation gestion 3 h.
- Identité visuelle : logo, charte, cartes de visite, signalétique, marquage de véhicule.
- Maintenance : 39 €/mois sans engagement — hébergement en France, sauvegardes quotidiennes, mises à jour, sécurité, et 1 h de modifications incluse par mois.

CONDITIONS
- Paiement échelonné : 30 % à la signature, 40 % à la validation des maquettes, 30 % à la mise en ligne. Virement, chèque ou carte, possibilité de payer en 3 fois sans frais. Entreprise immatriculée en Aveyron, facture avec TVA. Le devis signé est le prix final.
- Le site appartient à 100 % au client dès la livraison : nom de domaine à son nom, accès à l'hébergement, code source livré. Aucune formule de location, aucun fichier retenu.
- Le client gère son site lui-même : interface simple, formation d'1 h à la livraison, vidéos de rappel.
- Référencement local inclus dans chaque projet : structure technique propre, pages dédiées aux villes et métiers, fiche Google Business, collecte d'avis. Premiers effets entre 6 et 12 semaines. Ne jamais promettre la première place rapidement.
- Délais : 3 semaines pour un Essentiel, 4 à 6 pour un Premium, 8 à 10 pour une boutique. Facteur principal : la vitesse de transmission des textes et photos (Avero peut s'en charger).
- Zone : Rodez, Millau, toute l'Aveyron et les départements voisins. Échanges à distance (téléphone, e-mail, SMS, WhatsApp), aucun déplacement nécessaire.
- Contact : 06 12 91 32 66, contact@averoweb.fr, WhatsApp. Réponse à tout le monde sous 24 h ouvrées.

RÈGLES
- N'invente jamais un prix, un délai ou une prestation hors de cette liste. En cas de doute, propose de transmettre la question à l'équipe.
- Pour un devis chiffré, une demande de rappel, ou toute question qui sort de ce cadre : invite le visiteur à laisser sa demande dans le chat, l'équipe le recontacte sous 24 h ouvrées.
- Reste sur les sujets d'Avero Web (création de site, référencement, identité visuelle, déroulé d'un projet). Décline poliment le reste.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method' }, 405, cors);
    if (origin && origin !== ALLOWED_ORIGIN) return json({ error: 'origin' }, 403, cors);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'config' }, 500, cors);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'body' }, 400, cors); }

    // normalise : rôles user/assistant, alternance, plafonds
    const raw = Array.isArray(body.messages) ? body.messages : [];
    const messages = [];
    let chars = 0;
    for (const m of raw) {
      const role = m && m.role === 'assistant' ? 'assistant' : 'user';
      const content = String((m && m.content) || '').slice(0, 2000).trim();
      if (!content) continue;
      chars += content.length;
      if (messages.length && messages[messages.length - 1].role === role) {
        messages[messages.length - 1].content += '\n' + content;
      } else {
        messages.push({ role, content });
      }
    }
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length || messages.length > MAX_MESSAGES || chars > MAX_CHARS) {
      return json({ error: 'input' }, 400, cors);
    }

    const company = String(body.company || '').slice(0, 120).replace(/[\r\n]+/g, ' ').trim();
    const system = company ? SYSTEM_PROMPT + `\n\nEntreprise du visiteur : ${company}.` : SYSTEM_PROMPT;

    let apiRes;
    try {
      apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages }),
      });
    } catch (e) {
      return json({ error: 'upstream' }, 502, cors);
    }
    if (!apiRes.ok) return json({ error: 'upstream', status: apiRes.status }, 502, cors);

    const data = await apiRes.json();
    let reply = (data.content || [])
      .filter((b) => b && b.type === 'text')
      .map((b) => b.text)
      .join('')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .trim();

    if (!reply) return json({ error: 'empty' }, 502, cors);
    return json({ reply }, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
