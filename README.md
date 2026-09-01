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

## Formulaire de contact / devis

Chaque demande envoyée depuis le formulaire est relayée par e-mail vers
**contact@averoweb.fr** via [Web3Forms](https://web3forms.com) (pas de serveur à héberger).

Mise en service, une seule fois :

1. sur [web3forms.com](https://web3forms.com), saisir `contact@averoweb.fr` et valider le lien reçu par e-mail ;
2. copier la clé d'accès fournie ;
3. la coller dans `js/main.js`, section 7 :
   ```js
   var WEB3FORMS_KEY = 'la-cle-recuperee';
   ```

Tant que la clé n'est pas renseignée, le formulaire bascule automatiquement sur
l'ouverture du logiciel de messagerie du visiteur avec un message pré-rempli.
`ENDPOINT` reste disponible pour un relais JSON générique (Formspree…) au besoin.
