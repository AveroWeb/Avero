# Proxy Claude — chatbot averoweb.fr

`avero-chat-proxy.js` est un **Cloudflare Worker**. Il n'est **pas** servi
avec le site : il tourne sur `*.workers.dev` et garde la clé API Anthropic
en secret côté serveur.

Rôle : le mode « Assistant » du chat (js/main.js) envoie la conversation à
ce Worker ; le Worker interroge l'API Claude avec un prompt système décrivant
Avero Web, et renvoie `{ "reply": "..." }`.

## Déploiement

1. **dash.cloudflare.com → Workers & Pages → Create → Worker** → Deploy,
   puis **Edit code**.
2. Coller tout `avero-chat-proxy.js`, **Deploy**.
3. **Settings → Variables and Secrets → + Add**
   - Type : **Secret**
   - Name : `ANTHROPIC_API_KEY`
   - Value : `sk-ant-...`
   → Deploy.
4. Copier l'URL du Worker (`https://xxxxx.workers.dev`) et la coller dans
   `js/main.js` :
   ```js
   var AI_ENDPOINT = 'https://xxxxx.workers.dev';
   ```
   commit + push.
5. **Recommandé — Settings → Rate limiting** : une règle du type
   *20 requêtes / 10 min / IP* pour limiter les abus. Chaque requête = 1 appel
   Claude facturé.

Tant que `AI_ENDPOINT` est vide, l'assistant répond depuis la base de
connaissances locale (aucun appel, aucun coût).

## Réglages (en tête du fichier)

| Constante | Défaut | Note |
|---|---|---|
| `MODEL` | `claude-opus-5` | Pour une FAQ, `claude-haiku-4-5` suffit (~5× moins cher) |
| `MAX_TOKENS` | `1024` | Longueur max d'une réponse |
| `ALLOWED_ORIGIN` | `https://averoweb.fr` | CORS. Ajouter le domaine de préprod au besoin |
| `MAX_MESSAGES` / `MAX_CHARS` | `20` / `12000` | Plafonds anti-abus sur la conversation reçue |

## RGPD

Les conversations du mode Assistant transitent par l'API d'Anthropic
(sous-traitant, hors UE possible). À mentionner dans `confidentialite.html`.
