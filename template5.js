/* Template5 visual helper. Decorative only; existing data loading, login,
   admin CRUD, navigation, APIs and Google Sheet behaviour are untouched. */
(function () {
  'use strict';

  function bootTemplate5() {
    var hero = document.getElementById('home');
    var content = hero && hero.querySelector('.hero-content');
    if (!hero || !content) return;

    if (!content.querySelector('.template5-hero-badge')) {
      var badge = document.createElement('span');
      badge.className = 'template5-hero-badge';
      badge.textContent = 'LEARNING PLATFORM 360';
      content.insertBefore(badge, content.firstChild);
    }

    content.querySelector('.template5-hero-cta')?.remove();



    if (!document.querySelector('.template5-performance-strip')) {
      var strip = document.createElement('div');
      strip.className = 'template5-performance-strip';
      strip.setAttribute('aria-hidden', 'true');
      strip.innerHTML = '<div class="template5-performance-strip-inner">' +
        '<span>LEARNING</span><span>DIGITAL</span><span>ACTIVITY</span>' +
        '<span>KNOWLEDGE</span><span>COMMUNITY</span></div>';
      hero.insertAdjacentElement('afterend', strip);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootTemplate5, { once: true });
  } else {
    bootTemplate5();
  }
})();
