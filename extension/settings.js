"use strict";
(() => {
  // src/core.ts
  var MAX_CONFIG_BYTES = 9 * 1024 * 1024;
  var MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  var STORAGE_KEY = "zappyWhatsAppConfig";
  var DEFAULT_LINK_FREE_APP_TEMPLATE = {
    id: "app_login",
    label: "Como entrar na app",
    text: "Ol\xE1, {primeiroNome}!\n\nSe j\xE1 instalou a nossa app, basta abri-la e entrar com o seu n\xFAmero de telem\xF3vel registado connosco. Receber\xE1 um c\xF3digo por SMS para validar o acesso.\n\nSe precisar de ajuda, responda a esta mensagem."
  };
  var defaults = {
    version: 2,
    business: "",
    appUrl: "",
    images: {},
    templates: [
      { id: "contact", label: "Contactar cliente", text: "Ol\xE1, {primeiroNome}!" },
      { id: "app", label: "Enviar link da app", text: "Ol\xE1, {primeiroNome}!\n\nPode aceder \xE0 nossa app aqui: {linkApp}\n\n1. Abra o link e siga as instru\xE7\xF5es de instala\xE7\xE3o.\n2. Entre com o n\xFAmero de telem\xF3vel registado connosco.\n3. Introduza o c\xF3digo recebido por SMS.\n\nSe precisar de ajuda, responda a esta mensagem." },
      DEFAULT_LINK_FREE_APP_TEMPLATE
    ]
  };
  function migrateConfig(saved) {
    if (saved === void 0) return structuredClone(defaults);
    if (!saved || typeof saved !== "object") throw new Error("Configura\xE7\xE3o inv\xE1lida.");
    const raw = saved;
    if (raw.version === 2) return validateConfig(raw);
    if (raw.version !== 1) throw new Error("Vers\xE3o de configura\xE7\xE3o n\xE3o suportada.");
    const image = validateImage(raw.image);
    if (!Array.isArray(raw.templates)) throw new Error("Configura\xE7\xE3o inv\xE1lida.");
    return validateConfig({ ...raw, version: 2, images: image ? { legacy: image } : {}, templates: raw.templates.map((t) => {
      if (!t || typeof t.id !== "string" || typeof t.label !== "string") throw new Error("Configura\xE7\xE3o inv\xE1lida.");
      return { id: t.id, label: t.label, text: t.text, ...image && (t.id.startsWith("app") || /app/i.test(t.label)) ? { image: "legacy" } : {} };
    }) });
  }
  function validateImage(value) {
    if (typeof value !== "string") throw new Error("A imagem deve ser PNG, at\xE9 2 MB.");
    if (!value) return "";
    const prefix = "data:image/png;base64,";
    const encoded = value.slice(prefix.length);
    if (!value.startsWith(prefix) || encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("A imagem deve ser PNG, at\xE9 2 MB.");
    const bytes = atob(encoded);
    if (bytes.length > MAX_IMAGE_BYTES || !bytes.startsWith("\x89PNG\r\n\n")) throw new Error("A imagem deve ser PNG, at\xE9 2 MB.");
    return value;
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
    if (c.version !== 2 || typeof c.business !== "string" || c.business.length > 100 || typeof c.appUrl !== "string" || !c.images || typeof c.images !== "object" || Array.isArray(c.images) || !Array.isArray(c.templates) || c.templates.length < 1 || c.templates.length > 8) throw new Error("Configura\xE7\xE3o inv\xE1lida.");
    const ids = /* @__PURE__ */ new Set();
    const images2 = /* @__PURE__ */ Object.create(null);
    for (const t of c.templates) {
      if (!t || typeof t.id !== "string" || !t.id || t.id.length > 100 || ids.has(t.id) || typeof t.label !== "string" || !t.label.trim() || t.label.length > 60 || typeof t.text !== "string" || !t.text.trim() || t.text.length > 3e3) throw new Error("Preencha o t\xEDtulo e a mensagem de cada op\xE7\xE3o (at\xE9 3000 caracteres).");
      ids.add(t.id);
      if (t.image !== void 0) {
        if (typeof t.image !== "string" || !Object.hasOwn(c.images, t.image) || !c.images[t.image]) throw new Error("A imagem de uma mensagem n\xE3o foi encontrada. Escolha novamente a imagem.");
        if (!Object.hasOwn(images2, t.image)) images2[t.image] = validateImage(c.images[t.image]);
      }
      for (const match of t.text.matchAll(/\{([^{}]+)\}/g)) if (!["nome", "primeiroNome", "salao", "linkApp"].includes(match[1])) throw new Error(`Vari\xE1vel desconhecida: ${match[0]}`);
    }
    const result = { version: 2, business: c.business.trim(), appUrl: validateUrl(c.appUrl), templates: c.templates.map((t) => {
      const clean = t.text.replace(/^Olá, \{primeiroNome\}! (?:\u{1f60a}|\ufffd{1,2}|[\ud800-\udfff])(?=\r?\n\r?\n)/u, "Ol\xE1, {primeiroNome}!");
      const stock = defaults.templates.find((stock2) => stock2.id === t.id);
      return { id: t.id, label: t.label, text: clean === stock?.text ? clean : t.text, ...t.image ? { image: t.image } : {} };
    }), images: { ...images2 } };
    if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_CONFIG_BYTES) throw new Error("As defini\xE7\xF5es ultrapassam 9 MB. Remova ou reduza imagens.");
    return result;
  }
  function validateMessageText(text) {
    if (/[\ufffd\ud800-\udfff]/u.test(text)) throw new Error("A mensagem cont\xE9m um car\xE1ter inv\xE1lido (\uFFFD). Apague-o e escreva-o novamente.");
  }
  function renderMessage(template, name, config) {
    const vars = { nome: name, primeiroNome: name.trim().split(/\s+/)[0], salao: config.business, linkApp: config.appUrl };
    const message = template.replace(/\{([^{}]+)\}/g, (_all, key) => {
      if (!(key in vars)) throw new Error(`Vari\xE1vel desconhecida: {${key}}`);
      if (!vars[key]) throw new Error(key === "linkApp" ? "Adicione o link de instala\xE7\xE3o da app nas defini\xE7\xF5es da extens\xE3o, ou remova {linkApp} do texto da mensagem." : `Preencha o campo necess\xE1rio: ${key}.`);
      return vars[key];
    });
    validateMessageText(message);
    return message;
  }

  // src/settings.ts
  var byId = (id) => document.getElementById(id);
  var status = byId("status");
  var list = byId("templates");
  var picker = byId("message-picker");
  var editor = byId("editor");
  var images = /* @__PURE__ */ new Map();
  var loaded = false;
  var loading = false;
  var dirty = false;
  var saving = false;
  var conflict = false;
  var pendingImages = 0;
  var baseline;
  var ownWrite;
  var removed = null;
  var fingerprint = (value) => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
  function notify(text, kind = "info") {
    status.textContent = text;
    status.dataset.kind = kind;
  }
  function controls() {
    editor.disabled = !loaded || saving;
    byId("save").disabled = !loaded || saving || pendingImages > 0 || conflict;
    byId("save").textContent = saving ? "A guardar\u2026" : "Guardar altera\xE7\xF5es";
    byId("settings-form").setAttribute("aria-busy", String(saving));
    byId("undo").disabled = saving || !loaded;
    byId("reload").disabled = loading || saving || pendingImages > 0;
    byId("reset").disabled = loading || saving || pendingImages > 0;
  }
  function changed() {
    dirty = true;
    notify(conflict ? "Defini\xE7\xF5es alteradas noutra p\xE1gina. Recarregue antes de guardar." : "Altera\xE7\xF5es por guardar.", conflict ? "error" : "info");
  }
  function fieldError(field, text) {
    let error = byId(`${field.id}-error`);
    if (!error) {
      error = document.createElement("p");
      error.id = `${field.id}-error`;
      error.className = "field-error";
      field.after(error);
    }
    error.textContent = text;
    error.hidden = !text;
    field.setAttribute("aria-invalid", String(Boolean(text)));
    field.setAttribute("aria-describedby", error.id);
  }
  function validateFields() {
    let first = null;
    const check = (field, error) => {
      fieldError(field, error);
      if (error && !first) first = field;
    };
    const business = byId("business"), url = byId("app-url");
    check(business, business.value.length > 100 ? "Use um nome at\xE9 100 caracteres." : "");
    let urlError = "";
    try {
      validateUrl(url.value);
    } catch (error) {
      urlError = error.message;
    }
    check(url, urlError);
    for (const row2 of list.children) {
      const title = row2.querySelector(".template-label"), text = row2.querySelector(".template-text");
      check(title, !title.value.trim() ? "Escreva um t\xEDtulo para esta op\xE7\xE3o." : title.value.length > 60 ? "Use um t\xEDtulo at\xE9 60 caracteres." : "");
      let error = "";
      try {
        validateConfig({ ...defaults, templates: [{ id: "check", label: "Mensagem", text: text.value }] });
        validateMessageText(text.value);
      } catch (cause) {
        error = !text.value.trim() ? "Escreva a mensagem." : cause.message;
      }
      check(text, error);
    }
    if (!first) return true;
    const invalid = first;
    const row = invalid.closest(".template");
    if (row) selectTemplate(row.dataset.id);
    invalid.focus();
    notify("Corrija os campos assinalados antes de guardar.", "error");
    return false;
  }
  function readConfig() {
    const assets = /* @__PURE__ */ Object.create(null);
    return { version: 2, business: byId("business").value, appUrl: byId("app-url").value, images: assets, templates: Array.from(list.children).map((row) => {
      const id = row.dataset.id;
      const data = images.get(id);
      const image = data ? Object.keys(assets).find((key) => assets[key] === data) ?? id : void 0;
      if (image && data) assets[image] = data;
      return { id, label: row.querySelector(".template-label").value, text: row.querySelector(".template-text").value, ...image ? { image } : {} };
    }) };
  }
  function preview() {
    const c = readConfig();
    for (const row of list.children) {
      const body = row.querySelector("textarea").value;
      const output = row.querySelector(".message-preview");
      row.querySelector(".char-count").textContent = `${body.length} / 3000`;
      try {
        output.textContent = renderMessage(body, "Ana Silva", c);
        output.classList.remove("error");
      } catch (error) {
        output.textContent = error.message;
        output.classList.add("error");
      }
    }
  }
  function selectTemplate(id) {
    picker.value = id;
    for (const row of list.children) row.hidden = row.dataset.id !== id;
  }
  function refreshPicker(id = picker.value) {
    picker.replaceChildren(...Array.from(list.children, (row) => new Option(row.querySelector(".template-label").value || "Nova mensagem", row.dataset.id)));
    selectTemplate(Array.from(picker.options).some((option) => option.value === id) ? id : picker.options[0]?.value || "");
  }
  picker.addEventListener("change", () => selectTemplate(picker.value));
  function addTemplate(t, open = false, imageData = "") {
    const row = document.createElement("section");
    row.className = "template";
    row.dataset.id = t.id;
    const grid = document.createElement("div");
    grid.className = "editor-grid";
    const fields = document.createElement("div");
    fields.className = "editor-fields";
    const label = document.createElement("label");
    label.textContent = "T\xEDtulo";
    const name = document.createElement("input");
    name.className = "template-label";
    name.value = t.label;
    name.maxLength = 60;
    name.required = true;
    name.id = `label-${t.id}`;
    name.name = name.id;
    name.autocomplete = "off";
    label.htmlFor = name.id;
    const bodyLabel = document.createElement("label");
    bodyLabel.textContent = "Mensagem";
    const body = document.createElement("textarea");
    body.className = "template-text";
    body.value = t.text;
    body.maxLength = 3e3;
    body.required = true;
    body.id = `text-${t.id}`;
    body.name = body.id;
    body.autocomplete = "off";
    body.spellcheck = false;
    bodyLabel.htmlFor = body.id;
    const tools = document.createElement("div");
    tools.className = "compose-tools";
    const variables = document.createElement("select");
    variables.className = "variable";
    variables.setAttribute("aria-label", "Inserir dados na mensagem");
    variables.add(new Option("Inserir dado do cliente\u2026", ""));
    for (const [key, title] of Object.entries({ primeiroNome: "Primeiro nome", nome: "Nome completo", salao: "Sal\xE3o", linkApp: "Link da app" })) {
      variables.add(new Option(title, key));
    }
    variables.addEventListener("change", () => {
      const key = variables.value;
      if (!key) return;
      variables.value = "";
      if (body.value.length - (body.selectionEnd - body.selectionStart) + key.length + 2 > 3e3) {
        notify("A mensagem pode ter at\xE9 3000 caracteres.", "error");
        return;
      }
      body.setRangeText(`{${key}}`, body.selectionStart, body.selectionEnd, "end");
      fieldError(body, "");
      body.focus();
      changed();
      preview();
    });
    const count = document.createElement("span");
    count.className = "char-count";
    count.setAttribute("aria-hidden", "true");
    tools.append(variables, count);
    const imageTools = document.createElement("div");
    imageTools.className = "image-tools";
    const imageLabel = document.createElement("label");
    imageLabel.textContent = "Imagem opcional";
    imageLabel.className = "sr-only";
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/png";
    file.id = `image-${t.id}`;
    file.name = file.id;
    file.className = "file-input";
    imageLabel.htmlFor = file.id;
    file.tabIndex = -1;
    const pickImage = document.createElement("button");
    pickImage.type = "button";
    pickImage.className = "secondary";
    pickImage.addEventListener("click", () => file.click());
    const imageHint = document.createElement("span");
    imageHint.className = "image-hint hint";
    imageHint.id = `${file.id}-hint`;
    imageHint.textContent = "PNG at\xE9 2 MB";
    file.setAttribute("aria-describedby", imageHint.id);
    const imageStatus = document.createElement("p");
    imageStatus.className = "field-error";
    imageStatus.setAttribute("role", "status");
    imageStatus.hidden = true;
    const thumbnail = document.createElement("img");
    thumbnail.className = "thumbnail";
    thumbnail.alt = "Imagem desta mensagem";
    thumbnail.width = 160;
    thumbnail.height = 110;
    const removeImage = document.createElement("button");
    removeImage.type = "button";
    removeImage.className = "delete remove-image";
    removeImage.textContent = "Remover imagem";
    if (imageData) images.set(t.id, imageData);
    const refresh = () => {
      const data = images.get(t.id);
      thumbnail.hidden = !data;
      imageBubble.hidden = !data;
      imageCaption.hidden = !data;
      removeImage.hidden = !data;
      imageHint.hidden = !!data;
      pickImage.textContent = data ? "Substituir imagem" : "Adicionar imagem";
      if (data) {
        thumbnail.src = data;
        imageBubble.append(output);
        bubble.hidden = true;
      } else {
        thumbnail.removeAttribute("src");
        bubble.append(output);
        bubble.hidden = false;
      }
    };
    let imageRequest = 0;
    removeImage.addEventListener("click", () => {
      imageRequest++;
      images.delete(t.id);
      file.value = "";
      imageStatus.hidden = true;
      refresh();
      changed();
      pickImage.focus();
    });
    file.addEventListener("change", async () => {
      const selected = file.files?.[0];
      if (!selected) return;
      const request = ++imageRequest;
      pendingImages++;
      changed();
      controls();
      imageStatus.hidden = false;
      imageStatus.classList.remove("error");
      imageStatus.textContent = "A preparar imagem\u2026";
      try {
        if (selected.type !== "image/png" || selected.size > MAX_IMAGE_BYTES) throw new Error("Escolha uma imagem PNG at\xE9 2 MB.");
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reader.onabort = () => reject(new Error("N\xE3o foi poss\xEDvel ler a imagem."));
          reader.readAsDataURL(selected);
        });
        validateImage(data);
        const img = new Image();
        img.src = data;
        await img.decode();
        if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth > 4096 || img.naturalHeight > 4096) throw new Error("Use uma imagem at\xE9 4096 \xD7 4096 p\xEDxeis.");
        if (request !== imageRequest || !row.isConnected) return;
        images.set(t.id, data);
        refresh();
        changed();
        imageStatus.textContent = "Imagem pronta. Guarde as altera\xE7\xF5es.";
      } catch (error) {
        if (request === imageRequest && row.isConnected) {
          imageStatus.textContent = `${error.message}${images.has(t.id) ? " A imagem anterior foi mantida." : ""}`;
          imageStatus.classList.add("error");
          file.value = "";
        }
      } finally {
        pendingImages--;
        controls();
      }
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remover mensagem";
    remove.className = "delete remove-template";
    remove.addEventListener("click", () => {
      if (list.children.length <= 1) {
        notify("Mantenha pelo menos uma mensagem.", "error");
        return;
      }
      imageRequest++;
      imageStatus.hidden = true;
      removed = { row, index: Array.from(list.children).indexOf(row), image: images.get(t.id) };
      images.delete(t.id);
      row.remove();
      refreshPicker();
      byId("undo-note").textContent = `\u201C${name.value || "Nova mensagem"}\u201D removida.`;
      byId("undo-bar").hidden = false;
      byId("undo").focus();
      changed();
    });
    name.addEventListener("input", () => refreshPicker(t.id));
    imageTools.append(imageLabel, file, pickImage, imageHint, removeImage);
    fields.append(label, name, bodyLabel, body, tools, imageTools, imageStatus, remove);
    const panel = document.createElement("aside");
    panel.className = "preview-panel";
    const heading = document.createElement("div");
    heading.className = "preview-heading";
    const previewTitle = document.createElement("h3");
    previewTitle.textContent = "Pr\xE9-visualiza\xE7\xE3o";
    const recipient = document.createElement("span");
    recipient.textContent = "Para Ana Silva";
    heading.append(previewTitle, recipient);
    const chat = document.createElement("div");
    chat.className = "chat-preview";
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    const output = document.createElement("p");
    output.className = "message-preview";
    bubble.append(output);
    const imageBubble = document.createElement("div");
    imageBubble.className = "image-bubble";
    imageBubble.append(thumbnail);
    chat.append(bubble, imageBubble);
    const caption = document.createElement("p");
    caption.className = "preview-caption";
    caption.textContent = "Exemplo com um nome fict\xEDcio.";
    const imageCaption = document.createElement("span");
    imageCaption.textContent = "O texto abre preenchido no WhatsApp. A imagem fica copiada para colar com Ctrl+V quando quiser.";
    caption.append(imageCaption);
    panel.append(heading, chat, caption);
    grid.append(fields, panel);
    row.append(grid);
    list.append(row);
    refresh();
    refreshPicker(open ? t.id : picker.value);
  }
  function populate(c) {
    byId("business").value = c.business;
    byId("app-url").value = c.appUrl;
    images.clear();
    list.replaceChildren();
    c.templates.forEach((t, index) => addTemplate(t, index === 0, t.image ? c.images[t.image] : ""));
    preview();
    removed = null;
    byId("undo-bar").hidden = true;
    loaded = true;
    dirty = false;
    conflict = false;
    byId("reset").hidden = true;
    byId("reload").hidden = true;
    controls();
  }
  async function load() {
    if (loading) return;
    loading = true;
    loaded = false;
    controls();
    notify("A carregar\u2026");
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      baseline = fingerprint(result[STORAGE_KEY]);
      populate(migrateConfig(result[STORAGE_KEY]));
      notify("Defini\xE7\xF5es carregadas.");
    } catch {
      notify("N\xE3o foi poss\xEDvel ler as defini\xE7\xF5es. Recarregue ou reponha as mensagens iniciais.", "error");
      byId("reset").hidden = false;
      byId("reload").hidden = false;
    } finally {
      loading = false;
      controls();
    }
  }
  function storageConflict() {
    conflict = true;
    notify("Defini\xE7\xF5es alteradas noutra p\xE1gina. Recarregue antes de guardar.", "error");
    byId("reload").hidden = false;
    controls();
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !(STORAGE_KEY in changes)) return;
    const next = fingerprint(changes[STORAGE_KEY].newValue);
    if (saving && next === ownWrite) return;
    if (next !== baseline) storageConflict();
  });
  byId("add").addEventListener("click", () => {
    if (list.children.length >= 8) {
      status.textContent = "Pode guardar at\xE9 8 mensagens.";
      return;
    }
    addTemplate({ id: crypto.randomUUID(), label: "", text: "" }, true);
    changed();
    preview();
    list.lastElementChild?.querySelector("input")?.focus();
  });
  byId("undo").addEventListener("click", () => {
    if (!removed || saving) return;
    if (list.children.length >= 8) {
      notify("Remova uma mensagem antes de repor esta op\xE7\xE3o.", "error");
      return;
    }
    const { row, index, image } = removed;
    if (image) images.set(row.dataset.id, image);
    list.insertBefore(row, list.children[index] || null);
    refreshPicker(row.dataset.id);
    row.querySelector(".template-label")?.focus();
    removed = null;
    byId("undo-bar").hidden = true;
    changed();
    preview();
  });
  byId("settings-form").addEventListener("input", (event) => {
    const field = event.target;
    if (field === picker) return;
    if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && field.getAttribute("aria-invalid") === "true") fieldError(field, "");
    changed();
    preview();
  });
  window.addEventListener("beforeunload", (event) => {
    if (dirty || saving || pendingImages) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  byId("reload").addEventListener("click", () => {
    if (loading || saving || pendingImages) return;
    if (!dirty || window.confirm("Descartar as altera\xE7\xF5es por guardar e recarregar?")) void load();
  });
  byId("reset").addEventListener("click", () => {
    if (!window.confirm("Repor as mensagens iniciais? Ao guardar, substituir\xE1 as defini\xE7\xF5es anteriores.")) return;
    populate(structuredClone(defaults));
    changed();
  });
  byId("settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loaded || saving || pendingImages || conflict) return;
    if (!validateFields()) return;
    saving = true;
    controls();
    notify("A guardar\u2026");
    try {
      const c = validateConfig(readConfig());
      await navigator.locks.request(STORAGE_KEY, async () => {
        const current = await chrome.storage.local.get(STORAGE_KEY);
        if (fingerprint(current[STORAGE_KEY]) !== baseline || conflict) {
          storageConflict();
          return;
        }
        ownWrite = fingerprint(c);
        await chrome.storage.local.set({ [STORAGE_KEY]: c });
        baseline = ownWrite;
        if (!conflict) {
          dirty = false;
          for (const row of list.children) {
            const note = row.querySelector(".image-tools + .field-error");
            if (note && !note.classList.contains("error")) note.hidden = true;
          }
          notify("Altera\xE7\xF5es guardadas.", "success");
        }
      });
    } catch (error) {
      notify(error.message || "N\xE3o foi poss\xEDvel guardar. Tente novamente.", "error");
    } finally {
      ownWrite = void 0;
      saving = false;
      controls();
    }
  });
  void load();
})();
