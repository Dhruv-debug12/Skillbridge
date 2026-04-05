// SkillBridge — Theme Manager
// Checks local storage to apply dark or light mode before the page renders

const CONFIG_KEY = 'sb_theme';
const DARK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.996 12.882c.022-.233-.038-.476-.188-.681-.325-.446-.951-.544-1.397-.219-.95.693-2.059 1.086-3.188 1.162-1.368.092-2.765-.283-3.95-1.158-1.333-.985-2.139-2.415-2.367-3.935s.124-3.124 1.109-4.456c.142-.191.216-.435.191-.682-.053-.55-.542-.952-1.092-.898-2.258.22-4.314 1.18-5.895 2.651-1.736 1.615-2.902 3.847-3.137 6.386-.254 2.749.631 5.343 2.266 7.311s4.022 3.313 6.772 3.567c2.863.264 5.59-.627 7.749-2.261 1.942-1.468 3.238-3.535 3.52-5.918l-.001-.005.008-.864z"/></svg>`;
const LIGHT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 4.095c-4.359 0-7.905 3.546-7.905 7.905s3.546 7.905 7.905 7.905 7.905-3.546 7.905-7.905-3.546-7.905-7.905-7.905zm0 13.81c-3.256 0-5.905-2.649-5.905-5.905s2.649-5.905 5.905-5.905 5.905 2.649 5.905 5.905-2.649 5.905-5.905 5.905zm-1-16.905h2v3h-2zm0 19h2v3h-2zm-7.995-11.5l2.122-2.121 1.414 1.414-2.122 2.121zm14.85 14.85l2.121-2.122 1.414 1.414-2.121 2.122zm-17.85-2.35v-2h3v2zm19 0v-2h3v2zm-4.35-13.85l1.414-1.414 2.122 2.122-1.414 1.414zm-14.85 14.85l1.414-1.414 2.122 2.122-1.414 1.414z"/></svg>`;

// Apply theme instantly
function applyTheme() {
  const savedTheme = localStorage.getItem(CONFIG_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  return isDark;
}

const initialIsDark = applyTheme();

// Set up UI after load
document.addEventListener('DOMContentLoaded', () => {
  const toggles = document.querySelectorAll('.theme-toggle');
  
  function updateIcons(isDark) {
    toggles.forEach(toggle => {
      toggle.innerHTML = `
        <div class="theme-switch ${isDark ? 'dark' : ''}">
          <span class="icon-sun" style="display:flex;align-items:center;margin-left:4px;z-index:2;position:relative;">${LIGHT_ICON}</span>
          <span class="icon-moon" style="display:flex;align-items:center;margin-right:4px;z-index:2;position:relative;">${DARK_ICON}</span>
          <div class="switch-ball"></div>
        </div>
      `;
    });
  }
  
  updateIcons(initialIsDark);

  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const isCurrentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isCurrentlyDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(CONFIG_KEY, 'light');
        updateIcons(false);
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(CONFIG_KEY, 'dark');
        updateIcons(true);
      }
    });
  });
});
