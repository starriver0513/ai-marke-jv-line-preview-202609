(function () {
  "use strict";
  const data = window.LINE_PREVIEW_DATA;
  if (!data?.channels?.length) { document.body.textContent = "確認データを読み込めませんでした。"; return; }
  const tabs = document.getElementById("channelTabs");
  const thread = document.getElementById("chatThread");
  const dialog = document.getElementById("imageDialog");
  const positions = new Map();
  let active = -1;
  function node(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function appendText(target, text) {
    let cursor = 0;
    for (const match of text.matchAll(/(https?:\/\/[^\s]+)/g)) {
      target.append(document.createTextNode(text.slice(cursor, match.index)), node("span", "safe-url", match[0]));
      cursor = match.index + match[0].length;
    }
    target.append(document.createTextNode(text.slice(cursor)));
  }
  const panels = data.channels.map((channel, index) => {
    const numbered = channel.messages.filter(m => !m.is_reference_note).length;
    const tab = node("button", "", channel.label + "\n" + numbered + "通" + (numbered < channel.messages.length ? "＋ノート" : ""));
    tab.type = "button";
    tab.id = "tab-" + channel.id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", "log-" + channel.id);
    tab.addEventListener("click", () => select(index));
    tabs.append(tab);
    const panel = node("div", "channel-log");
    panel.id = "log-" + channel.id;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    channel.messages.forEach(message => {
      const article = node("article", "delivery");
      article.id = message.id;
      article.setAttribute("aria-label", message.is_reference_note ? "参考ノート" : "配信 " + message.number);
      article.append(node("div", "date-pill", message.date || message.timing || "参考ノート"));
      const row = node("div", "message-row");
      const avatar = node("div", "avatar", channel.id === "osaru" ? "🐵" : "P");
      avatar.setAttribute("aria-hidden", "true");
      const stack = node("div", "message-stack");
      stack.append(node("div", "sender-name", channel.sender_name + " · " + (message.is_reference_note ? "参考ノート" : "#" + String(message.number).padStart(2, "0"))));
      message.parts.forEach(part => {
        const bubble = node("div", "message-bubble");
        appendText(bubble, part);
        stack.append(bubble);
      });
      if (message.asset) {
        const button = node("button", "image-message");
        button.type = "button";
        button.setAttribute("aria-label", message.asset.name + "を拡大表示");
        const img = node("img");
        img.src = message.asset.path; img.alt = message.asset.name;
        img.loading = "lazy"; img.decoding = "async";
        button.append(img, node("span", "image-zoom-hint", "拡大"));
        button.addEventListener("click", () => {
          document.getElementById("dialogImage").src = message.asset.path;
          document.getElementById("dialogCaption").textContent = message.asset.name;
          dialog.showModal();
        });
        stack.append(button);
      }
      stack.append(node("div", "message-time", message.relative_time || ""));
      row.append(avatar, stack); article.append(row); panel.append(article);
    });
    panel.append(node("p", "log-end", "ここまでが" + channel.label + "の全配信です"));
    thread.append(panel);
    return panel;
  });
  function select(index, requestedId) {
    if (active >= 0) positions.set(active, window.scrollY);
    active = index;
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    Array.from(tabs.children).forEach((tab, i) => {
      tab.classList.toggle("is-active", i === index);
      tab.setAttribute("aria-selected", String(i === index));
    });
    document.getElementById("roomName").textContent = data.channels[index].room_name;
    history.replaceState(null, "", "#" + (requestedId || data.channels[index].id));
    if (requestedId && document.getElementById(requestedId)) document.getElementById(requestedId).scrollIntoView({block: "start"});
    else window.scrollTo(0, positions.get(index) || 0);
  }
  function fromHash() {
    const id = location.hash.slice(1);
    const index = data.channels.findIndex(c => c.id === id || c.messages.some(m => m.id === id));
    select(index >= 0 ? index : 0, id.includes("-") ? id : undefined);
  }
  document.getElementById("deviceOptions").addEventListener("click", event => {
    const button = event.target.closest("button[data-width]");
    if (!button) return;
    document.getElementById("phoneShell").style.setProperty("--device-width", button.dataset.width + "px");
    document.querySelectorAll("#deviceOptions button").forEach(option => option.classList.toggle("is-active", option === button));
  });
  document.getElementById("dialogClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();
