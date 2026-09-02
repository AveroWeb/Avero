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

})();
