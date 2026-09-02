# Avero Web

Site vitrine du studio **Avero Web** — création de sites internet à Rodez et Millau (Aveyron).

Page unique statique, sans dépendance ni build : HTML, CSS et JavaScript vanilla.

## Structure

```
avero-web/
├── index.html              # la page
├── mentions-legales.html   # pages légales
├── confidentialite.html    #   (RGPD)
├── cookies.html            #
├── 404.html                # page d'erreur (servie par GitHub Pages)
├── css/
│   ├── style.css           # styles de la page
│   ├── fonts.css           # @font-face — polices auto-hébergées
│   └── legal.css           # styles des pages légales
├── js/main.js              # interactions (menu, carrousel, compteurs, formulaire…)
├── assets/
│   ├── fonts/              # Gabarito / Figtree / Caveat en .woff2 (latin + latin-ext)
│   ├── og.jpg              # image de partage (Open Graph / Twitter, 1200×630)
│   └── icon-180/192/512.png# favicons PWA + apple-touch-icon
├── site.webmanifest        # manifeste PWA
├── robots.txt
├── sitemap.xml
├── CNAME                   # averoweb.fr (GitHub Pages)
└── .claude/                # config de prévisualisation locale (Claude Code)
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

## Polices

Les polices (Gabarito, Figtree, Caveat) sont **auto-hébergées** dans `assets/fonts/`
et déclarées dans `css/fonts.css`. Aucun appel à Google Fonts : plus rapide et rien
n'est transmis à un tiers (RGPD). Ce sont des fichiers variables : un `.woff2` par
famille couvre toutes les graisses. Pour mettre à jour une police, remplacer le
`.woff2` et vérifier la plage `font-weight` dans `css/fonts.css`.

## Référencement (Rodez / Millau)

Le site cible en priorité **Rodez** et **Millau**. Points d'appui :

- `<title>`, meta description, `og:*` et `geo.*` mentionnent les deux villes ;
- données structurées `LocalBusiness` + `FAQPage` en JSON-LD dans `index.html` ;
- `sitemap.xml` et `robots.txt` à la racine (Sitemap déclaré) ;
- pages / ancres dédiées aux villes dans le pied de page.

Après mise en ligne : déclarer le site dans la Google Search Console, soumettre le
sitemap, créer / relier la fiche Google Business Profile (Rodez).

## Mentions légales — à compléter

`mentions-legales.html` et `confidentialite.html` contiennent des marqueurs
`[À COMPLÉTER : …]` pour les informations que seule l'entreprise détient :
dénomination, statut juridique, SIRET, RCS / RM, n° TVA, adresse, directeur de la
publication, médiateur de la consommation. À renseigner avant la mise en ligne
publique.

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

Anti-spam : deux leurres cachés dans le formulaire (`societe_web` en texte,
`botcheck` en case à cocher — ce dernier active aussi le filtre natif de Web3Forms).

Tant que la clé n'est pas renseignée, le formulaire bascule automatiquement sur
l'ouverture du logiciel de messagerie du visiteur avec un message pré-rempli.
`ENDPOINT` reste disponible pour un relais JSON générique (Formspree…) au besoin.
