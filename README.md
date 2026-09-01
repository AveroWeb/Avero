# Avero Web

Site vitrine du studio **Avero Web** — création de sites internet en Aveyron (Rodez).

Page unique statique, sans dépendance ni build : HTML, CSS et JavaScript vanilla.

## Structure

```
avero-web/
├── index.html        # la page
├── css/style.css     # styles
├── js/main.js        # interactions (menu, carrousel, compteurs, formulaire…)
├── assets/           # images / médias
└── .claude/          # config de prévisualisation locale (Claude Code)
```

## Développement local

N'importe quel serveur statique fait l'affaire :

```bash
npx --yes http-server . -p 4321 -c-1
```

Puis ouvrir http://localhost:4321.

## Déploiement

Héberger le contenu du dossier tel quel (GitHub Pages, Netlify, serveur classique).
Aucune étape de compilation.

## Formulaire de contact

Par défaut, le formulaire ouvre le logiciel de messagerie avec un message pré-rempli
(voir `js/main.js`, section 7). Pour recevoir les demandes directement par e-mail,
renseigner un `ENDPOINT` Formspree ou activer les Netlify Forms.
