/* ═══════════════════════════════════════════════════════
   AVERO — page produit. Gère uniquement le formulaire
   « liste d'attente ». Le reste (menu, apparitions,
   compteurs, année, défilement) est assuré par main.js.
   Envoi e-mail vers contact@averoweb.fr via Web3Forms —
   même clé que le formulaire du site, aucun serveur.
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var WEB3FORMS_KEY = 'e70f59b2-50e9-422c-9c1f-5b0afbebb8b6';
  var DEST = 'contact@averoweb.fr';

  var form = document.getElementById('waitlist');
  if (!form) return;
  var msg = document.getElementById('waitMsg');

  var setErr = function (el, on) {
    var holder = el.closest('.fd') || el.closest('.rgpd');
    if (holder) holder.classList.toggle('err', on);
  };

  form.addEventListener('input', function (e) {
    if (e.target.value || e.target.checked) setErr(e.target, false);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // pièges à robots (champ texte + case cachés)
    if (form.societe_web.value || (form.botcheck && form.botcheck.checked)) {
      msg.textContent = 'Merci, c\'est bien noté.';
      msg.className = 'form__m ok';
      return;
    }

    var nom = form.nom, mail = form.email, rgpd = form.rgpd;
    var bad = [];

    if (!nom.value.trim()) bad.push(nom);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) bad.push(mail);
    if (!rgpd.checked) bad.push(rgpd);

    [nom, mail, rgpd].forEach(function (f) { setErr(f, bad.indexOf(f) > -1); });

    if (bad.length) {
      msg.textContent = 'Il manque votre nom ou un e-mail valide.';
      msg.className = 'form__m ko';
      bad[0].focus();
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    var payload = {
      access_key: WEB3FORMS_KEY,
      subject: 'Avero — liste d\'attente : ' + (form.agence.value.trim() || nom.value.trim()),
      from_name: 'Page Avero (averoweb.fr)',
      replyto: mail.value.trim(),
      botcheck: false,
      'Nom': nom.value.trim(),
      'E-mail': mail.value.trim(),
      'Agence': form.agence.value.trim() || '—',
      'Sites gérés': form.sites.value.trim() || '—'
    };

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().then(function (j) { return j; }, function () { return { success: r.ok }; });
    }).then(function (j) {
      btn.disabled = false;
      if (j && j.success === true) {
        msg.textContent = 'Vous êtes sur la liste, ' + nom.value.trim().split(' ')[0] + '. On vous écrit à l\'ouverture.';
        msg.className = 'form__m ok';
        form.reset();
      } else {
        msg.textContent = 'L\'envoi a échoué. Écrivez-nous à ' + DEST + '.';
        msg.className = 'form__m ko';
      }
    }).catch(function () {
      btn.disabled = false;
      msg.textContent = 'L\'envoi a échoué. Écrivez-nous à ' + DEST + '.';
      msg.className = 'form__m ko';
    });
  });
})();
