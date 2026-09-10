/**
 * api.js — Helper compartido para hablar con el backend de Vicky Cleaning.
 * Usa XMLHttpRequest (no fetch) para las llamadas POST porque Apps Script
 * redirige internamente y fetch() degrada el POST a GET en ese redirect.
 */

const VC_API_URL = 'https://script.google.com/macros/s/AKfycbyN-usg4vnnuHSMrj5BKYvVRSFkINscqKI1ENwfOkd2IN8Th-iNu8BpIKCdMVgHagQRYw/exec';
const VC_SESSION_KEY = 'vc_session';

const VickyAPI = {

  getSession() {
    try {
      const raw = localStorage.getItem(VC_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setSession(session) {
    localStorage.setItem(VC_SESSION_KEY, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(VC_SESSION_KEY);
  },

  // Llama una acción del backend. Adjunta el sessionToken automáticamente
  // salvo que opts.skipAuth sea true (usado solo por login).
  call(action, payload, opts) {
    payload = payload || {};
    opts = opts || {};
    return new Promise((resolve, reject) => {
      const session = VickyAPI.getSession();
      const fullPayload = Object.assign({}, payload);
      if (!opts.skipAuth) {
        if (!session || !session.sessionToken) {
          window.location.href = 'login.html';
          return;
        }
        fullPayload.sessionToken = session.sessionToken;
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', VC_API_URL, true);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      xhr.onload = function () {
        let data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch (e) {
          reject(new Error('Respuesta inválida del servidor.'));
          return;
        }
        if (!data.ok) {
          if (data.error && data.error.code === 'UNAUTHORIZED') {
            VickyAPI.clearSession();
            window.location.href = 'login.html';
            return;
          }
          reject(new Error(data.error ? data.error.message : 'Error desconocido.'));
          return;
        }
        resolve(data.data);
      };
      xhr.onerror = function () {
        reject(new Error('No se pudo conectar con el servidor. Revisa tu conexión.'));
      };
      xhr.send(JSON.stringify({ action: action, payload: fullPayload }));
    });
  },

  // Redirige a login.html si no hay sesión activa. Regresa la sesión si sí hay.
  requireAuth() {
    const session = VickyAPI.getSession();
    if (!session || !session.sessionToken) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  },

  hasRole(session, role) {
    if (!session || !session.user || !session.user.roles) return false;
    return session.user.roles.split(',').map(r => r.trim()).indexOf(role) !== -1;
  },

  logout() {
    const session = VickyAPI.getSession();
    if (session && session.sessionToken) {
      VickyAPI.call('logout', {}, {}).catch(() => {});
    }
    VickyAPI.clearSession();
    window.location.href = 'login.html';
  },
};
