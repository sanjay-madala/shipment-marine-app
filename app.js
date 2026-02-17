// ========== APP CONTROLLER ==========

let currentModule = 'scm';

document.addEventListener('DOMContentLoaded', () => {
    // Apply saved language
    const savedLang = localStorage.getItem('shipment-marine-lang') || 'en';
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === savedLang));
    currentLang = savedLang;

    // Set initial header text from translations
    document.querySelector('.logo').innerHTML = t('appName');
    document.querySelector('[data-module="scm"]').textContent = t('scmModule');
    document.querySelector('[data-module="npm"]').textContent = t('npmModule');
    document.querySelector('.user-info').innerHTML = t('admin');
    document.querySelector('#scm-module .nav-item[data-view="scm-tug-list"]').textContent = t('tugSchedules');
    document.querySelector('#scm-module .nav-item[data-view="scm-shipment-list"]').textContent = t('shipments');
    document.querySelector('#npm-module .nav-item[data-view="npm-shipment-list"]').textContent = t('containerShipments');
    document.querySelector('#npm-module .nav-item[data-view="npm-eir-list"]').textContent = t('eir');
    document.querySelector('#npm-module .nav-item[data-view="npm-inspection"]').textContent = t('containerInspection');

    // Module switcher
    document.querySelectorAll('.module-btn').forEach(btn => {
        btn.addEventListener('click', () => switchModule(btn.dataset.module));
    });

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            if (view.startsWith('scm-')) SCM.navigate(view);
            else if (view.startsWith('npm-')) NPM.navigate(view);
        });
    });

    // Modal close on overlay click
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Escape to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Initialize modules
    SCM.init();
    NPM.init();
});

function switchModule(mod) {
    currentModule = mod;
    document.querySelectorAll('.module-btn').forEach(b => b.classList.toggle('active', b.dataset.module === mod));
    document.getElementById('scm-module').classList.toggle('hidden', mod !== 'scm');
    document.getElementById('npm-module').classList.toggle('hidden', mod !== 'npm');
}
