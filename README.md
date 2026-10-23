# 🎟️ AcreditaQR Deluxe (`acriditaQRdeluxe`)

Evolución **Deluxe** de [AcreditaQR](https://github.com/Kvw1L0/AcreditaQR): plataforma integral Event-Tech para registro de invitados, emisión de Boarding Pass digital con código QR, control de acceso en puerta con **ingreso parcial de grupos** y **Dashboard en tiempo real** sobre Firebase Firestore.

## ✨ Mejoras Implementadas

### 1. Funcionalidad y Arquitectura
- **Dashboard en Tiempo Real (`dashboard.html`)**: Métricas KPI en vivo (`onSnapshot`), barra de progreso de aforo, buscador instantáneo, filtros por estado/categoría (`Pendientes`, `Parciales`, `Acreditados`, `VIP`), creación manual de invitados VIP, vista previa de QR, e **importación/exportación masiva CSV**.
- **Check-in Fraccionado / Ingreso Parcial de Grupos (`escaner.html`)**: Soporta `personas_ingresadas` además de mantener retrocompatibilidad total con `ingresado`. Si un grupo de 5 personas llega dividido, el operador puede registrar el ingreso de 3 personas ahora y el mismo QR conserva los 2 cupos restantes para más tarde.
- **Seguridad Staff (`initStaffGuard`)**: Protección mediante PIN de operador (por defecto `2026`, configurable desde el Dashboard) para el escáner y el panel de control.
- **Prevención de Duplicados y Recuperación de Entrada**: Validación automática por correo electrónico en `index.html` y pestaña dedicada para recuperar el Boarding Pass mediante email o código `INV-...`.
- **PWA & Offline Sync**: Persistencia local de Firestore (`enableIndexedDbPersistence`) + `manifest.json` + Service Worker (`sw.js`) con indicador de estado de red en vivo.

### 2. Estética y Diseño Visual (UI)
- **Boarding Pass estilo Apple Wallet**: Tarjeta con cabecera gradiente, muescas laterales y línea de corte troquelada, insignia por categoría (`General`, `VIP`, `Prensa`) y código en tipografía monoespaciada (`JetBrains Mono` + `Inter`).
- **Escáner HUD**: Visor con esquinas iluminadas, haz láser animado e iconos vectoriales SVG de alta legibilidad.

### 3. Experiencia de Usuario (UX)
- **Descarga de Ticket en PNG HD (`html2canvas`)**, envío directo por **WhatsApp** y copia de enlace único (`?ticket=INV-...`).
- **Persistencia en `localStorage`**: Si el invitado recarga la página, puede restaurar su QR con un clic.
- **Feedback Multisensorial en Puerta**: Síntesis de audio en tiempo real (`Web Audio API`) sin archivos externos + vibración háptica (`navigator.vibrate`) diferenciada para accesos aprobados, ingresos parciales y rechazos.
- **Modo Auto-Continuo, Selector de Cámara, Linterna (Torch) y Buscador Manual integrado en el escáner**.
