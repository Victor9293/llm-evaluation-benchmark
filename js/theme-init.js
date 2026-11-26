// Applies the saved theme before first paint to avoid a light/dark flash.
(function () {
  try {
    var mode = window.localStorage.getItem('leb.theme');
    if (mode === 'light' || mode === 'dark') document.documentElement.dataset.theme = mode;
  } catch (e) {
    /* storage unavailable: follow the system theme */
  }
})();
