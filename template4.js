/* Template4 visual helper. It adds only decorative/shortcut elements to the
   existing home hero and does not alter data loading, login, admin CRUD,
   navigation APIs or Google Sheet behavior. */
(function () {
  'use strict';

  function bootTemplate4() {
    var hero = document.getElementById('home');
    var content = hero && hero.querySelector('.hero-content');
    if (!hero || !content) return;

    content.querySelector('.template4-hero-cta')?.remove();


  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootTemplate4, { once: true });
  } else {
    bootTemplate4();
  }
})();
