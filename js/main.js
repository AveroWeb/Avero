/* ═══════════════════════════════════════════════════════
   AVERO WEB — interactions. Vanilla JS, zéro dépendance.
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ─── 1. Header : masquage au scroll + thème clair/foncé ─── */
  var hdr = $('#hdr');
  var hero = $('#accueil');
  var lastY = window.scrollY;
  var tick = false;

  function onScroll() {
    var y = window.scrollY;

    // le header passe en version claire tant qu'on est sur le hero sombre
    if (hero) {
      var overHero = y < hero.offsetHeight - 90;
      document.body.classList.toggle('hero-dark', overHero);
    }

    if (hdr && !document.body.classList.contains('lock')) {
      hdr.classList.toggle('hide', y > lastY && y > 300);
    }
    lastY = y;
    tick = false;
  }
  window.addEventListener('scroll', function () {
    if (!tick) { tick = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ─── 2. Menu mobile ─── */
  var burger = $('#burger');
  var menu = $('#menu');

  if (burger && menu) {
    $$('a', menu).forEach(function (a, i) { a.style.setProperty('--i', i); });

    var setMenu = function (open) {
      burger.classList.toggle('on', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      document.body.classList.toggle('lock', open);
      if (open) {
        menu.hidden = false;
        // rAF force un reflow avant d'ajouter la classe, pour que la transition
        // se déclenche bien (sinon le navigateur peut fusionner les deux états).
        // Filet de sécurité au cas où rAF traînerait (onglet en arrière-plan...).
        var safety = setTimeout(function () { menu.classList.add('on'); }, 60);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { clearTimeout(safety); menu.classList.add('on'); });
        });
      } else {
        menu.classList.remove('on');
        setTimeout(function () { if (!menu.classList.contains('on')) menu.hidden = true; }, 450);
      }
    };

    burger.addEventListener('click', function () { setMenu(!burger.classList.contains('on')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.classList.contains('on')) setMenu(false);
    });
  }

  /* ─── 3. Apparition au défilement ─── */
  var revealables = $$('.rv');
  revealables.forEach(function (el) { if (el.dataset.d) el.style.setProperty('--d', el.dataset.d); });

  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  /* ─── 4. Compteurs ───────────────────────────────────
     Sur tout élément [data-cnt] : stats, prix, chiffres
     de résultats des réalisations. Options :
       data-dec  nb de décimales      (ex. 0.9 → "0,9")
       data-pad  zéros de gauche      (ex. 3 → "03")
       data-sfx  suffixe collé        (ex. " h", "/5")
     Le comptage est de la motion « informative » (un chiffre
     qui défile, sans déplacement ni clignotement) : on le
     garde même en prefers-reduced-motion, juste plus court.
  ─────────────────────────────────────────────────────── */
  function pad0(v, w) { v = String(v); while (v.length < w) v = '0' + v; return v; }

  function fmtCnt(v, dec, pad) {
    if (dec) return v.toFixed(dec);
    var n = Math.round(v);
    return pad ? pad0(n, pad) : n.toLocaleString('fr-FR');
  }

  var CNT_MS = reduced ? 1100 : 2100;

  function count(el) {
    var to  = parseFloat(el.dataset.cnt || '0');
    var dec = parseInt(el.dataset.dec || '0', 10);
    var pad = parseInt(el.dataset.pad || '0', 10);
    var sfx = el.dataset.sfx || '';
    var t0 = null;
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = clamp((t - t0) / CNT_MS, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtCnt(to * e, dec, pad) + sfx;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var counters = $$('[data-cnt]');
  if ('IntersectionObserver' in window && 'requestAnimationFrame' in window) {
    var ioc = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { count(e.target); ioc.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { ioc.observe(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent = fmtCnt(
        parseFloat(el.dataset.cnt || '0'),
        parseInt(el.dataset.dec || '0', 10),
        parseInt(el.dataset.pad || '0', 10)
      ) + (el.dataset.sfx || '');
    });
  }

  /* ─── 5. Carrousel des réalisations ─── */
  var rail = $('#rail');
  if (rail) {
    var slides = $$('.wk', rail);
    var dots = $('#dots');
    var prev = $('#prev');
    var next = $('#next');
    var index = 0;

    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Aller à la réalisation ' + (i + 1));
      b.addEventListener('click', function () { go(i); });
      dots.appendChild(b);
    });
    var bullets = $$('button', dots);

    function go(i) {
      index = clamp(i, 0, slides.length - 1);
      var s = slides[index];
      // on centre la carte dans le rail
      rail.scrollTo({ left: s.offsetLeft - (rail.clientWidth - s.clientWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
    }

    function sync() {
      var mid = rail.scrollLeft + rail.clientWidth / 2;
      var best = 0, bestD = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      index = best;
      bullets.forEach(function (b, i) { b.classList.toggle('on', i === index); });
      prev.disabled = index === 0;
      next.disabled = index === slides.length - 1;
    }

    prev.addEventListener('click', function () { go(index - 1); });
    next.addEventListener('click', function () { go(index + 1); });

    var st = false;
    rail.addEventListener('scroll', function () {
      if (!st) { st = true; requestAnimationFrame(function () { sync(); st = false; }); }
    }, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    // glisser-déposer à la souris (le tactile est déjà natif)
    var down = false, startX = 0, startL = 0, moved = false;
    rail.addEventListener('mousedown', function (e) {
      down = true; moved = false;
      startX = e.pageX; startL = rail.scrollLeft;
      rail.style.cursor = 'grabbing';
      rail.style.scrollSnapType = 'none';
      rail.style.scrollBehavior = 'auto';
    });
    window.addEventListener('mousemove', function (e) {
      if (!down) return;
      var dx = e.pageX - startX;
      if (Math.abs(dx) > 4) moved = true;
      rail.scrollLeft = startL - dx;
    });
    window.addEventListener('mouseup', function () {
      if (!down) return;
      down = false;
      rail.style.cursor = '';
      rail.style.scrollSnapType = '';
      rail.style.scrollBehavior = '';
      if (moved) go(index);
    });
    // un glissement ne doit pas suivre un lien par accident
    rail.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);

    // flèches du clavier quand le rail a le focus
    rail.setAttribute('tabindex', '0');
    rail.setAttribute('role', 'region');
    rail.setAttribute('aria-label', 'Nos réalisations');
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    });
  }

  /* ─── 6. FAQ : une seule ouverte à la fois ─── */
  var accs = $$('.ac');
  accs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      accs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ─── 7. Formulaire ───────────────────────────────────
     Envoi réel de la demande de devis par e-mail vers
     contact@averoweb.fr, via Web3Forms — aucun serveur à
     héberger.

     MISE EN SERVICE (une seule fois) :
       1. aller sur https://web3forms.com
       2. saisir contact@averoweb.fr, valider le lien reçu
          par e-mail
       3. coller la clé fournie dans WEB3FORMS_KEY ci-dessous
     Tant que la clé n'est pas renseignée, le formulaire
     bascule automatiquement sur l'ouverture du logiciel de
     messagerie (fonctionnel, mais moins fluide).

     ENDPOINT reste dispo pour un relais JSON générique
     (Formspree…) si besoin un jour.
  ─────────────────────────────────────────────────────── */
  var WEB3FORMS_KEY = 'e70f59b2-50e9-422c-9c1f-5b0afbebb8b6';
  var ENDPOINT = null;
  var DEST = 'contact@averoweb.fr';

  var hasWeb3 = WEB3FORMS_KEY && WEB3FORMS_KEY.indexOf('REMPLACER') === -1;

  var form = $('#form');
  var msg = $('#formMsg');

  if (form) {
    var setErr = function (el, on) {
      var holder = el.closest('.fd') || el.closest('.rgpd');
      if (holder) holder.classList.toggle('err', on);
    };

    form.addEventListener('input', function (e) {
      if (e.target.value || e.target.checked) setErr(e.target, false);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // pièges à robots : champ texte + case à cocher cachés (botcheck = filtre natif Web3Forms)
      if (form.societe_web.value || (form.botcheck && form.botcheck.checked)) {
        msg.textContent = 'Merci, votre message a bien été envoyé.';
        msg.className = 'form__m ok';
        return;
      }

      var nom = form.nom, mail = form.email, message = form.message, rgpd = form.rgpd;
      var bad = [];

      if (!nom.value.trim()) bad.push(nom);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) bad.push(mail);
      if (message.value.trim().length < 10) bad.push(message);
      if (!rgpd.checked) bad.push(rgpd);

      [nom, mail, message, rgpd].forEach(function (f) { setErr(f, bad.indexOf(f) > -1); });

      if (bad.length) {
        msg.textContent = 'Il manque quelques informations pour vous répondre correctement.';
        msg.className = 'form__m ko';
        bad[0].focus();
        return;
      }

      var besoins = $$('input[name="besoin"]:checked', form).map(function (c) { return c.value; });
      var data = {
        nom: nom.value.trim(),
        entreprise: form.entreprise.value.trim(),
        email: mail.value.trim(),
        telephone: form.tel.value.trim(),
        besoins: besoins.join(', ') || 'Non précisé',
        message: message.value.trim()
      };

      var btn = $('button[type="submit"]', form);
      btn.disabled = true;

      var done = function (ok) {
        btn.disabled = false;
        if (ok) {
          msg.textContent = 'Merci ' + data.nom.split(' ')[0] + ' — c\'est bien reçu. On vous rappelle sous 24 h ouvrées.';
          msg.className = 'form__m ok';
          form.reset();
        } else {
          msg.textContent = 'L\'envoi a échoué. Écrivez-nous à ' + DEST + ' ou au 06 12 91 32 66.';
          msg.className = 'form__m ko';
        }
      };

      if (hasWeb3 || ENDPOINT) {
        var url = hasWeb3 ? 'https://api.web3forms.com/submit' : ENDPOINT;
        var payload = hasWeb3 ? {
          access_key: WEB3FORMS_KEY,
          subject: 'Demande de devis — ' + (data.entreprise || data.nom),
          from_name: 'Site averoweb.fr',
          replyto: data.email,
          botcheck: false,
          'Nom': data.nom,
          'Entreprise': data.entreprise || '—',
          'E-mail': data.email,
          'Téléphone': data.telephone || '—',
          'Besoin': data.besoins,
          'Message': data.message
        } : data;

        fetch(url, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (r) {
          return r.json().then(function (j) { return j; }, function () { return { success: r.ok }; });
        }).then(function (j) {
          done(j && (j.success === true || j.ok === true));
        }).catch(function () { done(false); });
      } else {
        var body = [
          'Nom : ' + data.nom,
          'Entreprise : ' + (data.entreprise || '—'),
          'E-mail : ' + data.email,
          'Téléphone : ' + (data.telephone || '—'),
          'Besoin : ' + data.besoins,
          '',
          data.message
        ].join('\n');

        window.location.href = 'mailto:' + DEST +
          '?subject=' + encodeURIComponent('Demande de projet — ' + (data.entreprise || data.nom)) +
          '&body=' + encodeURIComponent(body);

        msg.textContent = 'Votre logiciel de messagerie s\'ouvre avec la demande pré-remplie. Il ne reste qu\'à cliquer sur Envoyer.';
        msg.className = 'form__m ok';
        btn.disabled = false;
      }
    });
  }

  /* ─── 8. Année ─── */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ─── 9. Défilement molette adouci ────────────────────
     On intercepte l'événement « wheel » et on rejoint la
     position cible par interpolation (lerp) image par image,
     pour un scroll souris moins sec.
       • ignoré si prefers-reduced-motion
       • ignoré sur pointeur grossier / tactile (inertie native)
       • laisse le scroll natif dans une zone défilante
         (menu mobile ouvert, futur bloc en overflow…)
       • ne touche ni au zoom (Ctrl+molette) ni au scroll
         horizontal (Maj+molette, carrousel)
     Réglages : EASE plus bas = plus doux/planant, plus haut =
     plus réactif. STEP_CAP borne l'à-coup d'un gros cran.
  ─────────────────────────────────────────────────────── */
  (function smoothWheel() {
    if (reduced) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    var EASE = 0.14;
    var STEP_CAP = 1400;
    var LINE = 34;                       // px par « ligne » (deltaMode 1, Firefox)

    var doc = document.documentElement;
    var target = window.scrollY;
    var current = target;
    var running = false;

    function maxY() { return Math.max(0, doc.scrollHeight - window.innerHeight); }

    // remonte les ancêtres : y a-t-il une zone qui peut encore
    // défiler dans le sens de la molette ? si oui, on n'intervient pas.
    function scrollableAncestor(node, dir) {
      while (node && node.nodeType === 1 && node !== document.body) {
        if (node.scrollHeight > node.clientHeight + 1) {
          var oy = getComputedStyle(node).overflowY;
          if (oy === 'auto' || oy === 'scroll') {
            if (dir < 0 ? node.scrollTop > 0
                        : node.scrollTop + node.clientHeight < node.scrollHeight - 1) {
              return node;
            }
          }
        }
        node = node.parentNode;
      }
      return null;
    }

    function frame() {
      target = clamp(target, 0, maxY());
      current += (target - current) * EASE;
      if (Math.abs(target - current) < 0.5) { current = target; running = false; }
      // behavior explicite : sinon window.scrollTo suit le
      // scroll-behavior:smooth du CSS et lutte contre notre lerp.
      window.scrollTo({ top: Math.round(current), behavior: 'auto' });
      if (running) {
        requestAnimationFrame(frame);
      } else {
        doc.style.scrollBehavior = '';   // rend les ancres au CSS
      }
    }

    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
      if (document.body.classList.contains('lock')) return;
      if (!e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (maxY() <= 0) return;
      if (scrollableAncestor(e.target, e.deltaY)) return;

      e.preventDefault();

      var d = e.deltaY;
      if (e.deltaMode === 1) d *= LINE;
      else if (e.deltaMode === 2) d *= window.innerHeight;
      d = clamp(d, -STEP_CAP, STEP_CAP);

      if (!running) current = window.scrollY;   // repart du réel
      target = clamp((running ? target : current) + d, 0, maxY());

      if (!running) {
        running = true;
        doc.style.scrollBehavior = 'auto';
        requestAnimationFrame(frame);
      }
    }, { passive: false });

    // recalage quand la page bouge autrement (ancre, clavier, barre…)
    window.addEventListener('scroll', function () {
      if (!running) { target = current = window.scrollY; }
    }, { passive: true });
  })();

  /* ─── 10. Tarifs : la carte choisie passe au premier plan ─── */
  var plansBox = $('.plans');
  if (plansBox) {
    var planCards = $$('.plan', plansBox);

    var pickPlan = function (card) {
      planCards.forEach(function (c) {
        var on = c === card;
        c.classList.toggle('plan--hi', on);
        c.setAttribute('aria-current', on ? 'true' : 'false');
      });
    };

    planCards.forEach(function (c) {
      c.setAttribute('tabindex', '0');
      c.setAttribute('aria-current', c.classList.contains('plan--hi') ? 'true' : 'false');
      // le clic sur le bouton « Choisir … » sélectionne aussi la carte,
      // puis laisse l'ancre #contact faire son travail
      c.addEventListener('click', function () { pickPlan(c); });
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickPlan(c); }
      });
    });
  }

  /* ─── 11. Chat — assistant Avero ─────────────────────
     Bulle de discussion en bas à droite, au-dessus de WhatsApp.
     Deux modes :
       • « Réponses rapides » — puces pré-remplies, réponses scriptées ;
       • « Assistant » — saisie libre : une petite base de connaissances
         locale répond ; à défaut, la demande est transmise à l'équipe.
     L'accès est conditionné à la saisie de l'e-mail (+ confirmation) et
     du nom de l'entreprise. Le nouveau contact et les demandes « à
     recontacter » sont relayés vers contact@averoweb.fr via Web3Forms
     (même clé qu'à la section 7). Sans clé, tout reste en local.
  ─────────────────────────────────────────────────────── */
  (function chatWidget() {
    var root = $('#chat');
    if (!root) return;

    var launch   = $('#chatLaunch', root);
    var panel    = $('#chatPanel', root);
    var closeB   = $('#chatClose', root);
    var resetB   = $('#chatReset', root);
    var swBar    = $('#chatSwitch', root);
    var swRapid  = $('#chatSwRapid', root);
    var swAssist = $('#chatSwAssist', root);
    var scroller = $('#chatScroll', root);
    var gate     = $('#chatGate', root);
    var gateMsg  = $('#chatGateMsg', root);
    var log      = $('#chatLog', root);
    var quick    = $('#chatQuick', root);
    var compose  = $('#chatCompose', root);
    var input    = $('#chatInput', root);

    var K_LEAD  = 'avero.chat.lead';
    var K_LOG   = 'avero.chat.log';
    var K_RELAY = 'avero.chat.relay';
    var MAILRE  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    var lead = null, history = [], started = false, relaying = false, relayDirty = false;
    try { lead = JSON.parse(localStorage.getItem(K_LEAD) || 'null'); } catch (e) {}
    try { history = JSON.parse(localStorage.getItem(K_LOG) || '[]') || []; } catch (e) {}
    if (!lead || !MAILRE.test(lead.mail || '')) lead = null;
    if (!Array.isArray(history)) history = [];

    /* — base de connaissances (mode Assistant) — */
    var KB = [
      { k: /prix|tarif|co[ûu]te|combien(?!.*(temps|de temps))|budget|pas cher|devis chiffr/i,
        a: "Nos formules : Essentiel 1 000 € HT (jusqu'à 5 pages, livré en 3 semaines), Premium 2 600 € HT (jusqu'à 10 pages, blog, référencement local renforcé) et E-commerce de 1 500 à 5 000 € HT. Ensuite, maintenance 39 €/mois sans engagement. Paiement en 3 fois sans frais." },
      { k: /d[ée]lai|dur[ée]e|combien de temps|quand( |-)|d[ée]lais|rapide|vite|livr[ée]/i,
        a: "Comptez 3 semaines pour un site Essentiel, 4 à 6 semaines pour un Premium, 8 à 10 pour une boutique. Le principal facteur, c'est la vitesse à laquelle vous nous transmettez textes et photos — et on peut s'en charger." },
      { k: /r[ée]f[ée]rencement|\bseo\b|google|visib|premi[èe]re page|mots?[- ]cl[ée]s/i,
        a: "Le référencement local est inclus dans chaque projet : base technique propre, pages dédiées à vos villes (Rodez, Millau, Villefranche…) et à vos métiers, fiche Google Business optimisée, collecte d'avis. Les premiers effets se voient entre 6 et 12 semaines." },
      { k: /appartient|propri[ée]t|nom de domaine|code source|r[ée]cup[ée]rer|otage|location d[ée]guis/i,
        a: "Le site est à vous à 100 % dès la livraison : nom de domaine à votre nom, accès à l'hébergement, code source livré. Aucune formule de location, aucun fichier retenu." },
      { k: /paiement|payer|acompte|[ée]chelonn|facture|\btva\b|versement|3 fois/i,
        a: "Le règlement suit l'avancement : 30 % à la signature, 40 % à la validation des maquettes, 30 % à la mise en ligne. Virement, chèque ou carte, possibilité de 3 fois sans frais. Entreprise immatriculée en Aveyron, facture avec TVA." },
      { k: /maintenance|h[ée]bergement|sauvegarde|mises? [àa] jour|s[ée]curit|en panne/i,
        a: "Maintenance 39 €/mois, sans engagement : hébergement en France, sauvegardes quotidiennes, mises à jour, sécurité, et 1 h de modifications incluse chaque mois." },
      { k: /modifier|autonom|g[ée]rer|\bcms\b|back ?office|moi-m[êe]me|changer (un|le|les)/i,
        a: "Vous gérez le site vous-même : interface simple, formation d'1 h à la livraison et vidéos de rappel. Changer un horaire, ajouter une photo ou publier une actualité ne demande aucune compétence technique." },
      { k: /boutique|e-?commerce|vendre|vente en ligne|panier|stock|click.?(and|&|et).?collect|paiement cb/i,
        a: "Nos boutiques : catalogue et stocks, paiement CB sécurisé, transporteurs et click & collect, factures automatiques, formation gestion de 3 h. Budget de 1 500 à 5 000 € HT selon le catalogue." },
      { k: /\bzone\b|secteur|rodez|millau|aveyron|villefranche|d[ée]placement|o[ùu] [êe]tes|\bloin\b|distance/i,
        a: "On est basés à Rodez, présents à Millau, et on couvre toute l'Aveyron et les départements voisins. Les échanges se font à distance — téléphone, e-mail, SMS ou WhatsApp — sans déplacement." },
      { k: /\blogo\b|identit[ée]|charte|graphi|carte de visite|signal[ée]tique|\bprint\b/i,
        a: "On fait aussi l'identité visuelle : logo, couleurs, cartes de visite, signalétique, marquage de véhicule. Une image cohérente partout." },
      { k: /contact|t[ée]l[ée]phone|appeler|joindre|num[ée]ro|rappel|rendez-vous|\brdv\b|whatsapp|mail/i,
        a: "Par téléphone au 06 12 91 32 66, par e-mail à contact@averoweb.fr, ou sur WhatsApp. On répond à tout le monde sous 24 h ouvrées.", h: true },
      { k: /bonjour|bonsoir|salut|coucou|hello|\bhey\b/i,
        a: "Bonjour ! Je peux vous renseigner sur nos offres, les délais, le référencement ou le déroulé d'un projet. Que voulez-vous savoir ?" },
      { k: /merci|nickel|parfait|super|g[ée]nial|au revoir|bonne journ/i,
        a: "Avec plaisir ! Je reste là si besoin." }
    ];

    var DEVIS = "Pour un devis précis : décrivez ici votre projet (activité, pages voulues, délai idéal) et je passe la main à l'équipe. Devis détaillé ligne par ligne sous 72 h, et le prix signé est le prix final.";
    var FALLBACK = "Je ne suis pas sûr de bien savoir répondre à ça. Je peux transmettre votre question à l'équipe — elle vous recontacte sous 24 h ouvrées.";

    var QUICK = [
      { q: "Combien coûte un site ?",     t: "Combien coûte un site ?" },
      { q: "Quels délais ?",              t: "Quels sont vos délais ?" },
      { q: "Référencement local ?",       t: "Vous faites du référencement local ?" },
      { q: "À qui appartient le site ?",  t: "À qui appartient le site une fois payé ?" },
      { q: "Le paiement ?",               t: "Comment se passe le paiement ?" },
      { q: "Je veux un devis",            t: "Je voudrais un devis", devis: true },
      { q: "Parler à un conseiller",      handoff: true }
    ];

    /* — affichage — */
    function toBottom() { scroller.scrollTop = scroller.scrollHeight; }

    function bubble(who, text) {
      var el = document.createElement('div');
      el.className = 'chat__msg chat__msg--' + who;
      el.textContent = text;
      log.appendChild(el);
      toBottom();
    }

    function record(who, text) {
      history.push({ w: who, t: text });
      if (history.length > 60) history = history.slice(-60);
      try { localStorage.setItem(K_LOG, JSON.stringify(history)); } catch (e) {}
    }

    function botSay(text)  { bubble('bot', text);  record('bot', text); }
    function userSay(text) { bubble('user', text); record('user', text); }

    function typing(cb) {
      var el = document.createElement('div');
      el.className = 'chat__msg chat__msg--bot chat__typing';
      el.innerHTML = '<span></span><span></span><span></span>';
      log.appendChild(el);
      toBottom();
      var wait = reduced ? 140 : 380 + Math.random() * 420;
      setTimeout(function () { el.remove(); cb(); }, wait);
    }

    function actions(list) {
      var wrap = document.createElement('div');
      wrap.className = 'chat__act';
      list.forEach(function (it) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = it.label;
        b.addEventListener('click', function () { wrap.remove(); it.run(); });
        wrap.appendChild(b);
      });
      log.appendChild(wrap);
      toBottom();
    }

    /* — relais e-mail (Web3Forms) — */
    function transcript() {
      return history.map(function (m) {
        return (m.w === 'user' ? 'Visiteur : ' : 'Assistant : ') + m.t;
      }).join('\n');
    }

    function relay(reason, viaBeacon) {
      if (relaying || !lead) return;
      var isContact = reason.indexOf('contact') > -1;
      var st = {};
      try { st = JSON.parse(sessionStorage.getItem(K_RELAY) || '{}') || {}; } catch (e) {}
      st.n = st.n || 0;
      if (st.n >= 6) return;
      if (!isContact && st.at && Date.now() - st.at < 20000 && !relayDirty) return;

      var payload = {
        access_key: WEB3FORMS_KEY,
        subject: 'Chat averoweb.fr — ' + reason + ' : ' + (lead.ent || '—'),
        from_name: 'Chat averoweb.fr',
        replyto: lead.mail || DEST,
        botcheck: false,
        'Entreprise': lead.ent || '—',
        'E-mail': lead.mail || '—',
        'Motif': reason,
        'Conversation': history.length ? transcript() : '—',
        'Page': location.href,
        'Date': new Date().toLocaleString('fr-FR')
      };

      var seal = function (ok) {
        relaying = false;
        st.at = Date.now(); st.n += 1;
        try { sessionStorage.setItem(K_RELAY, JSON.stringify(st)); } catch (e) {}
        if (ok) relayDirty = false;
      };

      if (!hasWeb3) { seal(false); return; }
      relaying = true;

      if (viaBeacon && navigator.sendBeacon) {
        try {
          navigator.sendBeacon(
            'https://api.web3forms.com/submit',
            new Blob([JSON.stringify(payload)], { type: 'application/json' })
          );
          seal(true);
        } catch (e) { seal(false); }
        return;
      }

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().then(function (j) { return j; }, function () { return { success: r.ok }; });
      }).then(function (j) {
        seal(j && j.success === true);
      }).catch(function () { seal(false); });
    }

    function offerHandoff() {
      actions([
        { label: 'Oui, transmettre', run: function () {
            relayDirty = true;
            relay('à recontacter');
            botSay("C'est transmis. L'équipe vous recontacte sous 24 h ouvrées à " + lead.mail + ". Vous pouvez préciser votre besoin ci-dessous, ou appeler le 06 12 91 32 66.");
            setMode('assist');
          } },
        { label: 'Non merci', run: function () {
            botSay("Pas de souci. Je reste là pour vos questions.");
          } }
      ]);
    }

    /* — moteur de réponse — */
    function respond(text, forceDevis) {
      if (forceDevis || /\bdevis\b/i.test(text)) {
        botSay(DEVIS);
        botSay("Voulez-vous que je transmette votre demande maintenant ?");
        offerHandoff();
        return;
      }
      for (var i = 0; i < KB.length; i++) {
        if (KB[i].k.test(text)) {
          botSay(KB[i].a);
          if (KB[i].h) offerHandoff();
          return;
        }
      }
      botSay(FALLBACK);
      offerHandoff();
    }

    /* — puces pré-remplies — */
    function renderQuick() {
      quick.innerHTML = '';
      QUICK.forEach(function (it) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'chat__chip';
        b.textContent = it.q;
        b.addEventListener('click', function () {
          if (it.handoff) {
            userSay("Je souhaite parler à un conseiller");
            typing(function () {
              botSay("Bien sûr. Je transmets la conversation à l'équipe ?");
              offerHandoff();
            });
            return;
          }
          userSay(it.t);
          typing(function () { respond(it.t, it.devis); });
        });
        quick.appendChild(b);
      });
    }

    /* — modes — */
    function setMode(mode) {
      root.dataset.mode = mode;
      swRapid.setAttribute('aria-pressed', String(mode === 'rapid'));
      swAssist.setAttribute('aria-pressed', String(mode === 'assist'));
      quick.hidden = mode !== 'rapid';
      compose.hidden = mode !== 'assist';
      if (mode === 'assist') setTimeout(function () { input.focus(); }, 60);
    }

    /* — démarrage de la conversation (après la porte d'accès) — */
    function startConversation(fresh) {
      started = true;
      gate.hidden = true;
      log.hidden = false;
      swBar.hidden = false;
      resetB.hidden = false;
      log.innerHTML = '';

      if (!fresh && history.length) {
        history.forEach(function (m) { bubble(m.w, m.t); });
      } else {
        botSay("Bonjour ! Je suis l'assistant d'Avero Web. Choisissez une question ci-dessous, ou passez en mode « Assistant » pour écrire librement.");
      }
      renderQuick();
      setMode('rapid');
      toBottom();
    }

    /* — porte d'accès ─────────────────────────────────
       Vérification de l'e-mail par code à 6 chiffres, envoyé
       dans la boîte du visiteur via EmailJS (100 % côté client,
       aucun serveur à héberger).

       MISE EN SERVICE (une seule fois) :
         1. créer un compte sur https://www.emailjs.com
         2. y connecter un service d'envoi (Gmail, OVH, SMTP…)
         3. créer un modèle : champ « To Email » = {{to_email}},
            corps contenant le code {{passcode}} (et, au besoin,
            {{company}} / {{site}})
         4. reporter les 3 identifiants ci-dessous
       Tant qu'ils ne sont pas renseignés, la porte demande une
       simple ressaisie de l'e-mail (aucun envoi). Le code est
       vérifié côté navigateur : cela bloque les adresses
       fantaisistes, sans prétendre à l'inviolabilité.
       Un e-mail transitant par EmailJS, penser à le mentionner
       dans confidentialite.html.
    ─────────────────────────────────────────────────────── */
    var EMAILJS = {
      publicKey:  'k8DyViou5RVrc2AaY',
      serviceId:  'service_bfb6ppm',
      templateId: 'template_zj1pk7r'
    };
    var hasEmailJS = EMAILJS.publicKey.indexOf('REMPLACER') === -1 &&
                     EMAILJS.serviceId.indexOf('REMPLACER') === -1 &&
                     EMAILJS.templateId.indexOf('REMPLACER') === -1;

    var K_OTP = 'avero.chat.otp';
    var OTP_TTL = 10 * 60 * 1000;   // validité du code
    var OTP_MAX = 5;                // essais avant d'exiger un nouveau code
    var RESEND_WAIT = 30;           // secondes entre deux envois

    var stepId   = $('#chatStepId', root);
    var stepCode = $('#chatStepCode', root);
    var fdMail2  = $('#chatFdMail2', root);
    var codeInp  = $('#chatCode', root);
    var codeDest = $('#chatCodeDest', root);
    var gateBtn  = $('#chatGateBtn', root);
    var idBtn    = $('#chatStepId button[type="submit"]', root);
    var codeBtn  = $('#chatStepCode button[type="submit"]', root);
    var resendB  = $('#chatResend', root);
    var editB    = $('#chatEditMail', root);

    var pend = null;           // { mail, ent } en cours de vérification
    var sendFails = 0, resendCount = 0, resendTimer = null;

    function loadEmailJS(cb) {
      cb = cb || function () {};
      if (window.emailjs) { cb(); return; }
      if (loadEmailJS._q) { loadEmailJS._q.push(cb); return; }
      loadEmailJS._q = [cb];
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.async = true;
      var done = function () {
        try { if (hasEmailJS && window.emailjs && window.emailjs.init) window.emailjs.init({ publicKey: EMAILJS.publicKey }); } catch (e) {}
        var q = loadEmailJS._q || []; loadEmailJS._q = null;
        q.forEach(function (f) { try { f(); } catch (e) {} });
      };
      s.onload = done;
      s.onerror = done;
      document.head.appendChild(s);
    }

    function makeCode() {
      try {
        var a = new Uint32Array(1);
        (window.crypto || window.msCrypto).getRandomValues(a);
        return String(100000 + (a[0] % 900000));
      } catch (e) {
        return String(Math.floor(100000 + Math.random() * 900000));
      }
    }

    function readOtp()  { try { return JSON.parse(sessionStorage.getItem(K_OTP) || 'null'); } catch (e) { return null; } }
    function writeOtp(o) { try { o ? sessionStorage.setItem(K_OTP, JSON.stringify(o)) : sessionStorage.removeItem(K_OTP); } catch (e) {} }

    function fieldErr(el, on) {
      var fd = el.closest('.chat__fd') || el.closest('.chat__rgpd');
      if (fd) fd.classList.toggle('err', on);
    }

    function gateInfo(txt, kind) {
      gateMsg.textContent = txt || '';
      gateMsg.className = 'chat__gate-msg' + (kind ? ' ' + kind : '');
    }

    function busy(btn, on, label) {
      if (!btn) return;
      var span = btn.querySelector('span') || btn;
      btn.disabled = on;
      if (on) { span.dataset.rest = span.dataset.rest || span.textContent; span.textContent = label || 'Envoi…'; }
      else if (span.dataset.rest) { span.textContent = span.dataset.rest; delete span.dataset.rest; }
    }

    function showStep(which) {
      gate.dataset.step = which;
      stepId.hidden   = which === 'code';
      stepCode.hidden = which !== 'code';
      var sk = $('#chatSkip', root); if (sk) sk.remove();
      if (which === 'code') {
        codeDest.textContent = pend ? pend.mail : '';
        setTimeout(function () { codeInp.focus(); }, 60);
      }
    }

    function resendCooldown() {
      var left = RESEND_WAIT;
      clearInterval(resendTimer);
      resendB.disabled = true;
      resendB.textContent = 'Renvoyer le code (' + left + ' s)';
      resendTimer = setInterval(function () {
        left -= 1;
        if (left <= 0) {
          clearInterval(resendTimer);
          resendB.disabled = false;
          resendB.textContent = 'Renvoyer le code';
        } else {
          resendB.textContent = 'Renvoyer le code (' + left + ' s)';
        }
      }, 1000);
    }

    function dispatchCode() {
      var code = makeCode();
      writeOtp({ mail: pend.mail, ent: pend.ent, code: code, exp: Date.now() + OTP_TTL, tries: 0 });
      loadEmailJS(function () {
        if (!hasEmailJS || !window.emailjs) { onSendResult(false); return; }
        // On couvre le modèle « One-Time Password » d'EmailJS ({{email}},
        // {{passcode}}, {{time}}, {{company}}) comme un modèle sur mesure.
        window.emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, {
          email: pend.mail,
          to_email: pend.mail,
          passcode: code,
          time: '10 minutes',
          company: 'Avero Web',
          site: 'averoweb.fr',
          visitor_company: pend.ent
        }, { publicKey: EMAILJS.publicKey }).then(
          function () { onSendResult(true); },
          function () { onSendResult(false); }
        );
      });
    }

    function onSendResult(ok) {
      busy(idBtn, false);
      busy(codeBtn, false);
      if (ok) {
        sendFails = 0;
        showStep('code');
        gateInfo('Code envoyé — valable 10 minutes.', 'ok');
        resendCooldown();
      } else {
        sendFails += 1;
        gateInfo(sendFails >= 2
          ? "Envoi du code impossible pour le moment."
          : "L'envoi a échoué, réessayez dans un instant.", 'ko');
        if (sendFails >= 2 || resendCount >= 3) offerSkip();
      }
    }

    function offerSkip() {
      if ($('#chatSkip', root) || !pend) return;
      var host = stepCode.hidden ? stepId : stepCode;
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'chatSkip';
      b.className = 'btn btn--out btn--sm';
      b.style.marginTop = '.5rem';
      b.innerHTML = '<span>Continuer sans le code</span>';
      b.addEventListener('click', function () { finishGate(pend.mail, pend.ent); });
      host.appendChild(b);
    }

    function finishGate(mail, ent) {
      clearInterval(resendTimer);
      writeOtp(null);
      pend = null; sendFails = 0; resendCount = 0;
      gateInfo('');
      lead = { mail: mail, ent: ent, ts: Date.now() };
      try { localStorage.setItem(K_LEAD, JSON.stringify(lead)); } catch (e) {}
      relay('nouveau contact');
      startConversation(true);
    }

    function verifyStep() {
      var otp = readOtp();
      var v = (codeInp.value || '').replace(/\D/g, '');
      if (!otp || !pend) { gateInfo("Session expirée, recommencez.", 'ko'); showStep('id'); return; }
      if (Date.now() > otp.exp) { gateInfo("Code expiré. Demandez-en un nouveau.", 'ko'); return; }
      if (otp.tries >= OTP_MAX) { gateInfo("Trop d'essais. Demandez un nouveau code.", 'ko'); return; }
      if (v.length !== 6 || v !== otp.code) {
        otp.tries += 1; writeOtp(otp);
        fieldErr(codeInp, true);
        var rest = OTP_MAX - otp.tries;
        gateInfo(rest > 0
          ? "Code incorrect — " + rest + " essai" + (rest > 1 ? 's' : '') + " restant" + (rest > 1 ? 's' : '') + "."
          : "Trop d'essais. Demandez un nouveau code.", 'ko');
        return;
      }
      finishGate(pend.mail, pend.ent);
    }

    /* mode dégradé : EmailJS non configuré → ressaisie de l'e-mail */
    if (!hasEmailJS) {
      fdMail2.hidden = false;
      gate.dataset.step = 'retype';
      if (gateBtn) gateBtn.textContent = 'Démarrer la discussion';
    } else {
      loadEmailJS();
      var otp0 = readOtp();
      if (otp0 && otp0.mail && Date.now() < otp0.exp) {
        pend = { mail: otp0.mail, ent: otp0.ent || '—' };
        showStep('code');
      }
    }

    gate.addEventListener('input', function (e) {
      if (e.target.value || e.target.checked) fieldErr(e.target, false);
      if (e.target === codeInp) codeInp.value = codeInp.value.replace(/\D/g, '').slice(0, 6);
    });

    gate.addEventListener('submit', function (e) {
      e.preventDefault();
      var step = gate.dataset.step;

      if (step === 'code') { verifyStep(); return; }

      // leurre à robots : chat inerte, sans relais ni enregistrement
      if (gate.chat_site && gate.chat_site.value) {
        lead = { mail: (gate.email.value || '').trim() || 'visiteur', ent: (gate.entreprise.value || '').trim() || '—', ts: Date.now() };
        startConversation(true);
        return;
      }

      var m1 = gate.email.value.trim();
      var en = gate.entreprise.value.trim();
      var m2 = (!fdMail2.hidden && gate.email2) ? gate.email2.value.trim() : m1;
      var bad = [];

      if (!MAILRE.test(m1)) bad.push(gate.email);
      if (!fdMail2.hidden && (!m2 || m2 !== m1)) bad.push(gate.email2);
      if (en.length < 2) bad.push(gate.entreprise);
      if (!gate.rgpd.checked) bad.push(gate.rgpd);

      [gate.email, gate.email2, gate.entreprise, gate.rgpd].forEach(function (f) {
        if (f) fieldErr(f, bad.indexOf(f) > -1);
      });

      if (bad.length) {
        gateInfo((!fdMail2.hidden && m1 && m2 && m1 !== m2)
          ? "Les deux e-mails ne correspondent pas."
          : "Il manque une information pour démarrer.", 'ko');
        bad[0].focus();
        return;
      }

      gateInfo('');

      if (step === 'retype') { finishGate(m1, en); return; }

      // étape « id » : on envoie le code (les échecs s'accumulent tant que
      // l'adresse ne change pas → propose « continuer sans le code » au 2e)
      if (!pend || pend.mail !== m1) { sendFails = 0; resendCount = 0; }
      pend = { mail: m1, ent: en };
      busy(idBtn, true, 'Envoi du code…');
      dispatchCode();
    });

    resendB.addEventListener('click', function () {
      if (resendB.disabled || !pend) return;
      resendCount += 1;
      gateInfo('Nouveau code en route…');
      busy(codeBtn, true, 'Envoi…');
      dispatchCode();
    });

    editB.addEventListener('click', function () {
      clearInterval(resendTimer);
      writeOtp(null);
      pend = null; sendFails = 0; resendCount = 0;
      var sk = $('#chatSkip', root); if (sk) sk.remove();
      gateInfo('');
      showStep(fdMail2.hidden ? 'id' : 'retype');
      var f = $('#chatMail', root);
      if (f) f.focus();
    });

    resetB.addEventListener('click', function () {
      try { localStorage.removeItem(K_LEAD); localStorage.removeItem(K_LOG); } catch (e) {}
      clearInterval(resendTimer);
      writeOtp(null);
      lead = null; history = []; started = false; pend = null;
      sendFails = 0; resendCount = 0;
      log.innerHTML = ''; log.hidden = true;
      quick.hidden = true; compose.hidden = true;
      swBar.hidden = true; resetB.hidden = true;
      gate.hidden = false;
      gate.reset();
      showStep(fdMail2.hidden ? 'id' : 'retype');
      var f = $('#chatMail', root);
      if (f) f.focus();
    });

    /* — saisie libre — */
    function autoGrow() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 96) + 'px';
    }
    function sendCompose() {
      var v = input.value.trim();
      if (!v) return;
      input.value = ''; autoGrow();
      userSay(v);
      relayDirty = true;
      typing(function () { respond(v); });
    }
    input.addEventListener('input', autoGrow);
    input.addEventListener('keydown', function (e) {
      var enter = e.key === 'Enter' || e.key === 'Return' || e.keyCode === 13;
      if (enter && !e.shiftKey) { e.preventDefault(); sendCompose(); }
    });
    compose.addEventListener('submit', function (e) { e.preventDefault(); sendCompose(); });

    swRapid.addEventListener('click', function () { setMode('rapid'); });
    swAssist.addEventListener('click', function () { setMode('assist'); });

    /* — ouverture / fermeture — */
    function setOpen(open) {
      root.dataset.state = open ? 'open' : 'closed';
      launch.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;

      if (open) {
        if (!lead) {
          gate.hidden = false;
          log.hidden = true; swBar.hidden = true; resetB.hidden = true;
          quick.hidden = true; compose.hidden = true;
          setTimeout(function () {
            var f = gate.dataset.step === 'code' ? $('#chatCode', root) : $('#chatMail', root);
            if (f) f.focus();
          }, 80);
        } else if (!started) {
          startConversation(false);
        } else {
          setMode(root.dataset.mode || 'rapid');
        }
      } else {
        if (relayDirty) relay('complément de conversation');
        launch.focus();
      }
    }

    launch.addEventListener('click', function () { setOpen(root.dataset.state !== 'open'); });
    closeB.addEventListener('click', function () { setOpen(false); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.dataset.state === 'open') setOpen(false);
    });

    window.addEventListener('pagehide', function () {
      if (relayDirty) relay('complément de conversation', true);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && relayDirty) relay('complément de conversation', true);
    });
  })();

})();
