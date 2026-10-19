# Cambios pedidos por la clínica — estado

Última actualización: 14 de octubre de 2026. Nada de esto está publicado todavía (solo visible en local).

Leyenda: ✅ hecho · ⏸ en pausa, esperando indicaciones · ⏳ pendiente de material o de respuesta

## Lote 1 — 13 de octubre

### Home
| Cambio | Estado |
|---|---|
| Horario "Mon - Fri 8:30 am to 5:00 pm" en toda la página | ✅ También en encabezado, pie, Contacto, `llms.txt` y datos estructurados |
| Logo en "We are 562 endodontics" | ⏸ Falta que indiques cómo |
| Sección "Sedation Dentistry" en el banner | ⏸ Falta que indiques cómo |
| Reemplazar el video de Quicksleeper por `72wAbcc792g` | ✅ Home y High Tech Facility |
| En "About 562", usar el logo | ✅ |

### Endodontic Treatments
| Cambio | Estado |
|---|---|
| Cambiar la foto del microscopio por un diente con tratamiento de conductos (era la del **megamenú**, tarjeta Root Canal Treatment) | ✅ Ilustración del diente tratado en el megamenú; la foto de dentro del hub no cambia. Pendiente de validación de la Dra. |
| Banner pixelado | ✅ Foto de 1920 px recortada en la zona nítida |

### Endodontic Retreatment (revisada)
| Cambio | Estado |
|---|---|
| Foto del microscopio en "Common reasons patients return…" | ✅ |
| "What to expect": nueva viñeta de dos citas de 60 a 90 minutos | ✅ |

### Cracked Teeth (revisada otra vez)
| Cambio | Estado |
|---|---|
| Actualizar solo la primera foto | ⏳ Falta saber qué debe mostrar |

### Apical Surgery (revisada)
| Cambio | Estado |
|---|---|
| Eliminar "Anatomical Risk Management…" | ✅ |
| Dejar "Histopathological Analysis" | ✅ Ahora es una sección propia |

### Dental Trauma (revisada otra vez)
| Cambio | Estado |
|---|---|
| Texto bajo el título con enlaces a la AAE (PDF) y a la IADT | ✅ |
| Fila "Avulsion" en la tabla de lesiones | ✅ Va después de "Intrusive luxation" |

### High Tech Facility
| Cambio | Estado |
|---|---|
| Video de Quicksleeper nuevo | ✅ |

## Lote 2 — 14 de octubre

### Referrals
| Cambio | Estado |
|---|---|
| "Schedule with the next available provider" primero en la lista de doctores y marcada por defecto | ✅ Elegir un doctor concreto la desmarca, y elegirla desmarca a los demás |
| Casilla "Patient with dental anxiety, please discuss options for sedation" en "Referred for" | ✅ Sin marcar por defecto (la marca por defecto era para la anterior) |
| "Restorative Treatment Planned" → "Restorative Treatment Planned by Referring Dentist" | ✅ |
| Texto de apoyo: "Fuji" → "Resin Modified Glass Ionomer" | ✅ Se mantuvo el "We will restore with…" al inicio |
| Orden de "Restoration After Treatment": Restore with core / Restore with post and core / Leave space for post / Restore with sponge and glass ionomer | ✅ |
| PDF imprimible actualizado | ⏳ Lo enviará la clínica; hay que reemplazar `public/files/PatientReferral_FORM2025.pdf` |

### Professional Development
| Cambio | Estado |
|---|---|
| Texto nuevo de shadowing con la lista de 4 grupos | ✅ Se escribió "562 endodontics" en minúsculas. La meta descripción ya no menciona "high school" |

## Lote 3 — 19 de octubre

| Cambio | Estado |
|---|---|
| Banner de Root Canal pixelado (655 px) | ✅ Foto del microscopio de 1619 px, recortada en el procedimiento |
| Banners repetidos o de baja resolución en Treatments | ✅ Las 6 páginas tienen foto distinta, todas de 1440 px o más (máx. 1,32× de ampliación a 1920 px). Límite: 5 escenas distintas; Retreatment y Cracked Teeth son la misma sala desde dos ángulos |
| Root Canal: ilustración de tres etapas bajo la foto de la Dra. | ✅ Before / During / After (el diente terminado solo queda en el megamenú) |
| PDF del referral | ✅ `562-endodontics-patient-referral-form.pdf`; el anterior se borró |
| Foto nueva de Cracked Teeth (Codex) | ✅ Revisada, se queda; la Dra. valida la anatomía |

## Pendientes que no dependen de la clínica
- Configurar Azure (correo) y Cloudflare Turnstile (captcha) en Vercel.
- Mencionar el captcha de Cloudflare en la Privacy Policy (texto legal: lo revisa la clínica).
- Página Terms of Use (el consentimiento del formulario la menciona).
- Probar las redirecciones de `/high-tech-facility-2/` y `/high-tech-facility-2-2/` ya en Vercel.
