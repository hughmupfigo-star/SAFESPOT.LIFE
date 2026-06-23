/* SAFE — Google Analytics 4 loader.
   Put your Measurement ID in GA_ID below (one place, used site-wide).
   Find it at analytics.google.com -> Admin -> Data streams -> your web stream.
   Until a real G-XXXXXXXXXX is set, this does nothing (no errors, no tracking). */
(function () {
  'use strict';
  var GA_ID = 'G-XXXXXXXXXX'; // <-- replace with your GA4 Measurement ID

  if (!GA_ID || GA_ID.indexOf('G-') !== 0 || GA_ID === 'G-XXXXXXXXXX') return;

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID, { anonymize_ip: true });
})();
