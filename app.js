async function api(path, method="GET", data=null) {
  const options = { method, credentials: "same-origin", headers: {} };
  if (data !== null) { options.headers["Content-Type"] = "application/json"; options.body = JSON.stringify(data); }
  const response = await fetch(path, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}
function message(el, text, type="notice") { if (!el) return; el.className = `notice ${type}`; el.textContent = text; }
async function loadUser() {
  try { return (await api("/api/auth/me")).user; } catch { return null; }
}
