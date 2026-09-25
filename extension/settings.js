"use strict";
(() => {
  // src/core.ts
  var STORAGE_KEY = "zappyWhatsAppConfig";
  var DEFAULT_LINK_FREE_APP_TEMPLATE = {
    id: "app_login",
    label: "Como entrar na app",
    text: "Ol\xE1, {primeiroNome}! \u{1F60A}\n\nSe j\xE1 instalou a nossa app, basta abri-la e entrar com o seu n\xFAmero de telem\xF3vel registado connosco. Receber\xE1 um c\xF3digo por SMS para validar o acesso.\n\nSe precisar de ajuda, responda a esta mensagem."
  };
  var defaults = {
    version: 1,
    business: "",
    appUrl: "",
    image: "",
    templates: [
      { id: "contact", label: "Contactar cliente", text: "Ol\xE1, {primeiroNome}!" },
      { id: "app", label: "Enviar link da app", text: "Ol\xE1, {primeiroNome}! \u{1F60A}\n\nPode aceder \xE0 nossa app aqui: {linkApp}\n\n1. Abra o link e siga as instru\xE7\xF5es de instala\xE7\xE3o.\n2. Entre com o n\xFAmero de telem\xF3vel registado connosco.\n3. Introduza o c\xF3digo recebido por SMS.\n\nSe precisar de ajuda, responda a esta mensagem." },
      DEFAULT_LINK_FREE_APP_TEMPLATE
    ]
  };
  function migrateConfig(saved) {
    if (!saved || typeof saved !== "object") return structuredClone(defaults);
    const raw = saved;
    const base = {
      version: 1,
      business: typeof raw.business === "string" ? raw.business : "",
      appUrl: typeof raw.appUrl === "string" ? raw.appUrl : "",
      image: typeof raw.image === "string" ? raw.image : "",
      templates: Array.isArray(raw.templates) ? raw.templates.filter(Boolean).map((t) => ({ id: String(t.id || ""), label: String(t.label || ""), text: String(t.text || "") })) : []
    };
    if (base.templates.length === 0) {
      base.templates = structuredClone(defaults.templates);
    } else {
      const hasLinkFree = base.templates.some((t) => t.id === "app_login" || !t.text.includes("{linkApp}") && t.label.toLowerCase().includes("entrar na app"));
      if (!hasLinkFree && base.templates.length < 8) {
        const appIndex = base.templates.findIndex((t) => t.id === "app");
        const newTemplate = structuredClone(DEFAULT_LINK_FREE_APP_TEMPLATE);
        let uniqueId = newTemplate.id;
        let counter = 1;
        while (base.templates.some((t) => t.id === uniqueId)) {
          uniqueId = `${newTemplate.id}_${counter++}`;
        }
        newTemplate.id = uniqueId;
        if (appIndex >= 0) {
          base.templates.splice(appIndex + 1, 0, newTemplate);
        } else {
          base.templates.push(newTemplate);
        }
      }
    }
    return validateConfig(base);
  }
  function validateUrl(raw) {
    const value = raw.trim();
    if (!value) return "";
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Introduza um link completo, come\xE7ado por https://.");
    }
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("O link deve usar HTTPS e n\xE3o incluir credenciais.");
    if (value.length > 2e3) throw new Error("O link \xE9 demasiado longo.");
    return url.href;
  }
  function validateConfig(value) {
    if (!value || typeof value !== "object") throw new Error("Configura\xE7\xE3o inv\xE1lida. Abra as defini\xE7\xF5es e guarde novamente.");
    const c = value;
    if (c.version !== 1 || typeof c.business !== "string" || c.business.length > 100 || typeof c.appUrl !== "string" || typeof c.image !== "string" || !Array.isArray(c.templates) || c.templates.length < 1 || c.templates.length > 8) throw new Error("Configura\xE7\xE3o inv\xE1lida.");
    const ids = /* @__PURE__ */ new Set();
    for (const t of c.templates) {
      if (!t || typeof t.id !== "string" || ids.has(t.id) || typeof t.label !== "string" || !t.label.trim() || t.label.length > 60 || typeof t.text !== "string" || !t.text.trim() || t.text.length > 3e3) throw new Error("Preencha o t\xEDtulo e a mensagem de cada op\xE7\xE3o (at\xE9 3000 caracteres).");
      ids.add(t.id);
      for (const match of t.text.matchAll(/\{([^{}]+)\}/g)) if (!["nome", "primeiroNome", "salao", "linkApp"].includes(match[1])) throw new Error(`Vari\xE1vel desconhecida: ${match[0]}`);
    }
    if (c.image && (!/^data:image\/png;base64,iVBORw0KGgo/.test(c.image) || c.image.length > 28e5)) throw new Error("A imagem deve ser PNG, at\xE9 2 MB.");
    return { version: 1, business: c.business.trim(), appUrl: validateUrl(c.appUrl), templates: c.templates.map((t) => ({ id: t.id, label: t.label.trim(), text: t.text })), image: c.image };
  }

  // src/settings.ts
  var byId = (id) => document.getElementById(id);
  var status = byId("status");
  var list = byId("templates");
  var imageData = "";
  var loaded = false;
  function addTemplate(t) {
    const row = document.createElement("div");
    row.className = "template";
    row.dataset.id = t.id;
    const label = document.createElement("label");
    label.textContent = "Nome da op\xE7\xE3o";
    const name = document.createElement("input");
    name.className = "template-label";
    name.value = t.label;
    name.maxLength = 60;
    name.required = true;
    name.id = `label-${t.id}`;
    label.htmlFor = name.id;
    const bodyLabel = document.createElement("label");
    bodyLabel.textContent = "Texto da mensagem";
    const body = document.createElement("textarea");
    body.className = "template-text";
    body.value = t.text;
    body.maxLength = 3e3;
    body.required = true;
    body.id = `text-${t.id}`;
    bodyLabel.htmlFor = body.id;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remover esta op\xE7\xE3o";
    remove.className = "delete";
    remove.addEventListener("click", () => {
      if (list.children.length > 1) {
        row.remove();
        status.textContent = "Altera\xE7\xF5es por guardar.";
      } else status.textContent = "Mantenha pelo menos uma mensagem.";
    });
    row.append(label, name, bodyLabel, body, remove);
    list.append(row);
  }
  function refreshImage() {
    const preview = byId("preview");
    if (imageData) preview.src = imageData;
    else preview.removeAttribute("src");
    preview.hidden = !imageData;
    byId("remove-image").hidden = !imageData;
  }
  async function load() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const c = migrateConfig(result[STORAGE_KEY]);
      byId("business").value = c.business;
      byId("app-url").value = c.appUrl;
      imageData = c.image;
      list.replaceChildren();
      c.templates.forEach(addTemplate);
      refreshImage();
      loaded = true;
    } catch {
      status.textContent = "N\xE3o foi poss\xEDvel ler as defini\xE7\xF5es. Recarregue esta p\xE1gina.";
    }
  }
  byId("add").addEventListener("click", () => {
    if (list.children.length >= 8) {
      status.textContent = "Pode guardar at\xE9 8 op\xE7\xF5es.";
      return;
    }
    addTemplate({ id: crypto.randomUUID(), label: "", text: "" });
    list.lastElementChild?.querySelector("input")?.focus();
  });
  byId("settings-form").addEventListener("input", () => {
    status.textContent = "Altera\xE7\xF5es por guardar.";
  });
  byId("remove-image").addEventListener("click", () => {
    imageData = "";
    byId("image-file").value = "";
    refreshImage();
    status.textContent = "Imagem removida. Guarde as defini\xE7\xF5es.";
  });
  byId("image-file").addEventListener("change", async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    byId("save").disabled = true;
    try {
      if (file.type !== "image/png" || file.size > 2 * 1024 * 1024) throw new Error("Escolha uma imagem PNG at\xE9 2 MB.");
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("N\xE3o foi poss\xEDvel ler a imagem."));
        reader.readAsDataURL(file);
      });
      if (!data.startsWith("data:image/png;base64,iVBORw0KGgo")) throw new Error("O ficheiro n\xE3o \xE9 uma imagem PNG v\xE1lida.");
      const img = new Image();
      img.src = data;
      await img.decode();
      if (img.naturalWidth > 4096 || img.naturalHeight > 4096) throw new Error("Use uma imagem at\xE9 4096 \xD7 4096 p\xEDxeis.");
      imageData = data;
      refreshImage();
      status.textContent = "Imagem pronta. Guarde as defini\xE7\xF5es.";
    } catch (error) {
      status.textContent = error.message || "Imagem inv\xE1lida.";
      input.value = "";
    } finally {
      byId("save").disabled = false;
    }
  });
  byId("settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loaded) return;
    const save = byId("save");
    save.disabled = true;
    try {
      const c = {
        version: 1,
        business: byId("business").value,
        appUrl: byId("app-url").value,
        image: imageData,
        templates: Array.from(list.children).map((row) => ({ id: row.dataset.id, label: row.querySelector(".template-label").value, text: row.querySelector(".template-text").value }))
      };
      await chrome.storage.local.set({ [STORAGE_KEY]: validateConfig(c) });
      status.textContent = "Defini\xE7\xF5es guardadas. Volte \xE0 ficha do cliente.";
    } catch (error) {
      status.textContent = error.message || "N\xE3o foi poss\xEDvel guardar.";
    } finally {
      save.disabled = false;
    }
  });
  void load();
})();
