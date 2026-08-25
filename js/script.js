document.addEventListener('DOMContentLoaded', async () => {
    const pageModules = [
        window.QLTSPageCommon,
        window.QLTSPageData,
        window.QLTSPageUI,
        window.QLTSPageDashboard,
        window.QLTSPageLicense,
        window.QLTSPageSettings
    ];

    for (const module of pageModules) {
        if (module && typeof module.init === 'function') {
            await module.init();
        }
    }
});
