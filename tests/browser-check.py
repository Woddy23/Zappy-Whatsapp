from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parent.parent
fixture = (root / "tests/fixture.html").read_text(encoding="utf-8")
with TemporaryDirectory(prefix="zappy-browser-") as profile, sync_playwright() as p:
    context = p.chromium.launch_persistent_context(profile, channel="chromium", headless=True,
        args=[f"--disable-extensions-except={root / 'extension'}", f"--load-extension={root / 'extension'}"])
    outbound, errors = [], []
    context.on("page", lambda page: page.on("pageerror", lambda error: errors.append(str(error))))
    context.route("https://zappysoftware.com/backoffice/**", lambda route: route.fulfill(content_type="text/html", body=fixture))
    def handoff(route):
        outbound.append(route.request.url)
        route.fulfill(content_type="text/html", body="<p>Intercepted. No WhatsApp contact.</p>")
    context.route("https://wa.me/**", handoff)
    worker = context.service_workers[0] if context.service_workers else context.wait_for_event("serviceworker")
    extension_id = worker.url.split("/")[2]
    page = context.new_page()
    page.goto("https://zappysoftware.com/backoffice/test", wait_until="networkidle")
    page.get_by_role("button", name="WhatsApp", exact=True).click()
    expect(page.locator("#recipient")).to_have_text("Ana Silva\n+12025550147")
    page.get_by_role("button", name="Contactar cliente", exact=True).click()
    page.wait_for_timeout(500)
    assert len(outbound) == 1
    url = urlsplit(outbound[0])
    assert url.path == "/12025550147" and parse_qs(url.query)["text"] == ["Olá, Ana!"]
    page.get_by_role("button", name="Escrever mensagem…", exact=True).click()
    page.locator("#message").fill("Old draft")
    page.locator("#telemovelttnc").fill("2025550199")
    expect(page.locator("#message")).to_have_value("")
    expect(page.locator("#retry")).to_be_visible()
    assert len(outbound) == 1
    page.locator("#retry").click()
    expect(page.locator("#recipient")).to_have_text("Ana Silva\n+12025550199")
    # Change without dispatching an event and immediately launch: production recheck must block.
    page.evaluate("document.querySelector('#telemovelttnc').value = '2025550147'; document.querySelector('[data-zappy-whatsapp-helper]').shadowRoot.querySelector('[data-template=contact]').click()")
    assert len(outbound) == 1
    options = context.new_page()
    options.goto(f"chrome-extension://{extension_id}/settings.html", wait_until="networkidle")
    other = context.new_page()
    other.goto(options.url, wait_until="networkidle")
    options.locator("#business").fill("Example Salon")
    options.get_by_role("button", name="Guardar alterações", exact=True).click()
    expect(options.locator("#status")).to_have_text("Alterações guardadas.")
    expect(other.get_by_role("button", name="Guardar alterações", exact=True)).to_be_disabled()
    assert worker.evaluate("async () => (await chrome.storage.local.get('zappyWhatsAppConfig')).zappyWhatsAppConfig.business") == "Example Salon"
    options.get_by_role("button", name="Remover mensagem", exact=True).click()
    options.get_by_role("button", name="Desfazer", exact=True).click()
    assert options.locator("#message-picker option").count() == 3
    options.locator(".template-label:visible").fill("")
    options.get_by_role("button", name="Guardar alterações", exact=True).click()
    expect(options.locator("#status")).to_have_text("Corrija os campos assinalados antes de guardar.")
    assert worker.evaluate("async () => (await chrome.storage.local.get('zappyWhatsAppConfig')).zappyWhatsAppConfig.templates.length") == 3
    assert not errors, errors
    print(f"PASS: installed extension in Chromium {context.browser.version}; recipient/template handoff, stale draft and launch protection, real options saves/conflicts, undo and invalid-save preservation.")
    print("Synthetic DOM contract only. WhatsApp intercepted; no messages sent.")
    context.close()
