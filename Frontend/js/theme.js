document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const key = 'kalkulator-theme';

    const apply = (theme) => {
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
    };

    // default: ikut preference browser, tapi bisa diubah dari toggle
    const saved = localStorage.getItem(key);
    if (saved) {
        apply(saved);
    } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        apply(prefersDark ? 'dark' : 'light');
    }

    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    let current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const render = () => {
        btn.title = current === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        btn.innerHTML = current === 'dark'
            ? '<i class="fas fa-moon"></i>'
            : '<i class="fas fa-sun"></i>';
    };

    render();

    btn.addEventListener('click', () => {
        current = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem(key, current);
        apply(current);
        render();
    });
});

