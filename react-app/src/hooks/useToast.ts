// Toast notification utility
export function showToast(msg: string, color = '#22c55e', duration = 3000) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${color};color:white;padding:12px 20px;border-radius:10px;font-weight:700;font-size:13px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.4);transition:opacity .4s;animation:slideIn .3s ease`;
    t.textContent = msg;
    // Add animation style once
    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = '@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
        document.head.appendChild(style);
    }
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 400);
    }, duration);
}
