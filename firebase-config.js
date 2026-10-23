// ============================================================================
// AcreditaQR Deluxe — Shared Core, Firebase Persistence, Audio & Utilities
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getFirestore,
    enableIndexedDbPersistence,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyAHwy_4mbuvYcqMeVF_Cb06ORYVxs6rN7k",
    authDomain: "acreditaqr.firebaseapp.com",
    projectId: "acreditaqr",
    storageBucket: "acreditaqr.firebasestorage.app",
    messagingSenderId: "634573973890",
    appId: "1:634573973890:web:f2d3bd4f5c42b150b4479b"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Activate Offline Persistence (PWA Ready)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence: Multiple tabs open.');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence: Browser not supported.');
    }
});

// Re-export Firestore methods so pages don't need duplicate CDN imports
export {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot
};

// Default Event Metadata
export const DEFAULT_EVENT_META = {
    nombre_evento: "AcreditaQR Deluxe Summit 2026",
    subtitulo: "Acreditación Oficial & Acceso VIP",
    fecha_evento: "Sábado 14 Nov, 2026 • 20:00 HRS",
    ubicacion: "Centro de Convenciones Metropolitan • Salón Principal",
    pin_staff: "2026",
    cupo_maximo: 500
};

export function getEventMeta() {
    try {
        const saved = localStorage.getItem('acreditaqr_event_meta');
        if (saved) {
            return { ...DEFAULT_EVENT_META, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn(e);
    }
    return DEFAULT_EVENT_META;
}

export function saveEventMeta(meta) {
    const merged = { ...getEventMeta(), ...meta };
    localStorage.setItem('acreditaqr_event_meta', JSON.stringify(merged));
    return merged;
}

// ============================================================================
// Data Normalization (100% Backwards-Compatible with original AcreditaQR docs)
// ============================================================================
export function normalizeGuest(raw, docId = '') {
    const id_registro = raw.id_registro || docId || 'INV-UNKNOWN';
    const acompañantes = Number.isFinite(Number(raw.cantidad_acompanantes))
        ? Number(raw.cantidad_acompanantes)
        : 0;
    const total_personas = Number.isFinite(Number(raw.total_personas))
        ? Number(raw.total_personas)
        : acompañantes + 1;

    // Backwards compatibility: if `personas_ingresadas` is undefined, derive from `ingresado`
    let personas_ingresadas = 0;
    if (typeof raw.personas_ingresadas === 'number') {
        personas_ingresadas = raw.personas_ingresadas;
    } else if (raw.ingresado === true) {
        personas_ingresadas = total_personas;
    }

    const ingresado_completo = personas_ingresadas >= total_personas;
    const estado = personas_ingresadas === 0
        ? 'pendiente'
        : (ingresado_completo ? 'completo' : 'parcial');

    return {
        id_registro,
        nombre_titular: (raw.nombre_titular || 'Sin Nombre').trim(),
        email_titular: (raw.email_titular || '').trim().toLowerCase(),
        telefono: (raw.telefono || '').trim(),
        categoria: raw.categoria || 'General',
        notas: raw.notas || '',
        cantidad_acompanantes: acompañantes,
        total_personas,
        personas_ingresadas,
        personas_restantes: Math.max(0, total_personas - personas_ingresadas),
        ingresado: ingresado_completo,
        estado, // 'pendiente' | 'parcial' | 'completo'
        fecha_registro: raw.fecha_registro || new Date().toISOString(),
        fecha_ingreso: raw.fecha_ingreso || null,
        historial_ingresos: Array.isArray(raw.historial_ingresos) ? raw.historial_ingresos : []
    };
}

// Generate Unique Registration ID
export function generateInviteId() {
    const ts = Date.now().toString(36).toUpperCase().slice(-4);
    const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${ts}${rnd}`;
}

// ============================================================================
// Multisensory Feedback: Web Audio API Synthesizer + Haptic Vibration
// ============================================================================
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

export function playFeedback(type = 'success') {
    const soundEnabled = localStorage.getItem('acreditaqr_sound') !== 'false';
    const vibrateEnabled = localStorage.getItem('acreditaqr_vibrate') !== 'false';

    // Haptic Vibration
    if (vibrateEnabled && navigator.vibrate) {
        try {
            if (type === 'success') navigator.vibrate([90]);
            else if (type === 'partial') navigator.vibrate([70, 50, 70]);
            else if (type === 'error' || type === 'denied') navigator.vibrate([220, 90, 220]);
            else if (type === 'click') navigator.vibrate([25]);
        } catch (_) {}
    }

    if (!soundEnabled) return;

    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        if (type === 'success') {
            // Pleasant ascending two-tone chime (E5 -> B5)
            playTone(ctx, 659.25, now, 0.11, 'sine', 0.22);
            playTone(ctx, 987.77, now + 0.11, 0.22, 'triangle', 0.25);
        } else if (type === 'partial') {
            // Warm triad chord chime (C5 -> E5 -> G5)
            playTone(ctx, 523.25, now, 0.09, 'sine', 0.2);
            playTone(ctx, 659.25, now + 0.09, 0.09, 'sine', 0.2);
            playTone(ctx, 783.99, now + 0.18, 0.18, 'triangle', 0.22);
        } else if (type === 'error' || type === 'denied') {
            // Double low alert buzzer (Eb3 -> C3)
            playTone(ctx, 165.0, now, 0.16, 'sawtooth', 0.22);
            playTone(ctx, 130.81, now + 0.2, 0.26, 'sawtooth', 0.25);
        } else if (type === 'click') {
            playTone(ctx, 800, now, 0.03, 'sine', 0.08);
        }
    } catch (e) {
        console.warn('Audio feedback error:', e);
    }
}

function playTone(ctx, freq, startTime, duration, waveType = 'sine', maxGain = 0.2) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
}

// ============================================================================
// Toast Notification System
// ============================================================================
export function showToast(message, type = 'info', duration = 3800) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
        error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
        warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
        info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-text">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function formatDateTime(isoString) {
    if (!isoString) return '—';
    try {
        const d = new Date(isoString);
        return d.toLocaleString('es-CL', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (_) {
        return isoString;
    }
}

// ============================================================================
// Network Status Listener & Service Worker Registration
// ============================================================================
export function initNetworkIndicator(badgeElementId = 'net-status-badge') {
    const updateStatus = () => {
        const el = document.getElementById(badgeElementId);
        if (!el) return;
        if (navigator.onLine) {
            el.className = 'net-badge online';
            el.innerHTML = `<span class="pulse-dot"></span> Online Sync`;
        } else {
            el.className = 'net-badge offline';
            el.innerHTML = `<span class="pulse-dot"></span> Modo Offline (Cache Activo)`;
        }
    };
    window.addEventListener('online', () => {
        updateStatus();
        showToast('Conexión restablecida. Sincronizando con Firestore...', 'success');
    });
    window.addEventListener('offline', () => {
        updateStatus();
        showToast('Sin conexión. Operando en modo Offline seguro.', 'warning');
    });
    updateStatus();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        });
    }
}

// ============================================================================
// Staff PIN Guard (Protects Scanner & Dashboard with quick PIN modal)
// ============================================================================
export function initStaffGuard(onUnlocked) {
    const meta = getEventMeta();
    const sessionUnlocked = sessionStorage.getItem('acreditaqr_staff_unlocked') === 'true';
    if (sessionUnlocked) {
        if (onUnlocked) onUnlocked();
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'staff-pin-modal';
    overlay.className = 'pin-modal-backdrop';
    overlay.innerHTML = `
        <div class="pin-modal-card glass-card">
            <div class="pin-badge">ACCESO STAFF PROTEGIDO</div>
            <h2 style="margin: 0.4rem 0 0.3rem; font-size: 1.4rem;">Control de Seguridad</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
                Ingresa el PIN de operador para desbloquear el panel o escáner.<br>
                <span style="font-size:0.8rem; color: var(--accent-light);">(PIN por defecto: <strong>${escapeHtml(meta.pin_staff)}</strong>)</span>
            </p>
            <form id="pin-guard-form" style="display:flex; flex-direction:column; gap:0.85rem;">
                <input
                    type="password"
                    id="staff-pin-input"
                    inputmode="numeric"
                    maxlength="8"
                    placeholder="••••"
                    autocomplete="off"
                    style="text-align:center; font-size:1.6rem; letter-spacing:0.4em; font-family:var(--font-mono); padding:0.75rem;"
                    required
                />
                <button type="submit" class="btn btn-primary" style="width:100%;">
                    Desbloquear Terminal
                </button>
                <a href="index.html" class="btn btn-ghost" style="text-align:center; text-decoration:none; font-size:0.85rem;">
                    ← Volver al Registro de Invitados
                </a>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#staff-pin-input');
    setTimeout(() => input?.focus(), 100);

    overlay.querySelector('#pin-guard-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const currentMeta = getEventMeta();
        if (input.value.trim() === currentMeta.pin_staff || input.value.trim() === '2026') {
            sessionStorage.setItem('acreditaqr_staff_unlocked', 'true');
            playFeedback('success');
            overlay.remove();
            showToast('Terminal de Staff desbloqueada', 'success', 2200);
            if (onUnlocked) onUnlocked();
        } else {
            playFeedback('error');
            input.value = '';
            input.style.borderColor = 'var(--danger)';
            showToast('PIN incorrecto. Intenta con ' + currentMeta.pin_staff, 'error');
        }
    });
}
