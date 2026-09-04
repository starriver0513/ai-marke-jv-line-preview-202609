(function () {
  "use strict";

  const data = window.LINE_PREVIEW_DATA;
  if (!data || !Array.isArray(data.channels) || data.channels.length === 0) {
    document.body.textContent = "確認データを読み込めませんでした。";
    return;
  }

  const elements = {
    channelTabs: document.getElementById("channelTabs"),
    deviceOptions: document.getElementById("deviceOptions"),
    messageIndex: document.getElementById("messageIndex"),
    messageCount: document.getElementById("messageCount"),
    phoneShell: document.getElementById("phoneShell"),
    chatThread: document.getElementById("chatThread"),
    roomName: document.getElementById("roomName"),
    datePill: document.getElementById("datePill"),
    senderAvatar: document.getElementById("senderAvatar"),
    senderName: document.getElementById("senderName"),
    messageParts: document.getElementById("messageParts"),
    imageMessage: document.getElementById("imageMessage"),
    messageImage: document.getElementById("messageImage"),
    messageTime: document.getElementById("messageTime"),
    reviewKicker: document.getElementById("reviewKicker"),
    reviewTitle: document.getElementById("reviewTitle"),
    detailTiming: document.getElementById("detailTiming"),
    detailDate: document.getElementById("detailDate"),
    detailText: document.getElementById("detailText"),
    detailAsset: document.getElementById("detailAsset"),
    prevButton: document.getElementById("prevButton"),
    nextButton: document.getElementById("nextButton"),
    imageDialog: document.getElementById("imageDialog"),
    dialogClose: document.getElementById("dialogClose"),
    dialogImage: document.getElementById("dialogImage"),
    dialogCaption: document.getElementById("dialogCaption"),
  };

  const state = {
    channelIndex: 0,
    messageIndex: 0,
  };

  function currentChannel() {
    return data.channels[state.channelIndex];
  }

  function currentMessage() {
    return currentChannel().messages[state.messageIndex];
  }

  function channelCountLabel(channel) {
    const numbered = channel.messages.filter((message) => !message.is_reference_note).length;
    const notes = channel.messages.length - numbered;
    return notes ? `${numbered}通＋ノート` : `${numbered}通`;
  }

  function appendTextWithSafeUrls(target, text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    let cursor = 0;
    let match;
    while ((match = urlPattern.exec(text)) !== null) {
      target.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      const url = document.createElement("span");
      url.className = "safe-url";
      url.textContent = match[0];
      url.title = "確認用のためリンクは無効です";
      target.appendChild(url);
      cursor = match.index + match[0].length;
    }
    target.appendChild(document.createTextNode(text.slice(cursor)));
  }

  function buildChannelTabs() {
    elements.channelTabs.replaceChildren();
    data.channels.forEach((channel, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.role = "tab";
      button.dataset.channelIndex = String(index);
      button.setAttribute("aria-selected", String(index === state.channelIndex));
      button.classList.toggle("is-active", index === state.channelIndex);
      button.textContent = `${channel.label}\n${channelCountLabel(channel)}`;
      button.style.whiteSpace = "pre-line";
      button.addEventListener("click", () => selectChannel(index));
      elements.channelTabs.appendChild(button);
    });
  }

  function buildMessageIndex() {
    const channel = currentChannel();
    elements.messageIndex.replaceChildren();
    elements.messageCount.textContent = channelCountLabel(channel);

    channel.messages.forEach((message, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.messageIndex = String(index);
      button.classList.toggle("is-active", index === state.messageIndex);
      button.setAttribute("aria-current", index === state.messageIndex ? "true" : "false");

      const number = document.createElement("span");
      number.className = "index-number";
      number.textContent = message.is_reference_note ? "NOTE" : `#${String(message.number).padStart(2, "0")}`;

      const copy = document.createElement("span");
      copy.className = "index-copy";
      const strong = document.createElement("strong");
      strong.textContent = message.timing || "配信タイミング未設定";
      const date = document.createElement("span");
      date.textContent = message.date || "日時未設定";
      copy.append(strong, date);
      button.append(number, copy);
      button.addEventListener("click", () => selectMessage(index));
      elements.messageIndex.appendChild(button);
    });
  }

  function renderMessage() {
    const channel = currentChannel();
    const message = currentMessage();

    elements.roomName.textContent = channel.room_name;
    elements.datePill.textContent = message.date || message.timing || "参考ノート";
    elements.senderName.textContent = channel.sender_name;
    elements.senderAvatar.textContent = channel.id === "osaru" ? "🐵" : "P";
    elements.messageParts.replaceChildren();

    message.parts.forEach((part) => {
      const bubble = document.createElement("div");
      bubble.className = "message-bubble";
      appendTextWithSafeUrls(bubble, part);
      elements.messageParts.appendChild(bubble);
    });

    if (message.asset) {
      elements.imageMessage.hidden = false;
      elements.messageImage.src = message.asset.path;
      elements.messageImage.alt = message.asset.name;
      elements.imageMessage.setAttribute("aria-label", `${message.asset.name}を拡大表示`);
    } else {
      elements.imageMessage.hidden = true;
      elements.messageImage.removeAttribute("src");
      elements.messageImage.alt = "";
    }

    elements.messageTime.textContent = message.relative_time || "";
    elements.reviewKicker.textContent = channel.label;
    elements.reviewTitle.textContent = message.is_reference_note ? "参考ノート" : `配信 #${message.number}`;
    elements.detailTiming.textContent = message.timing || "未設定";
    elements.detailDate.textContent = message.date || "未設定";
    elements.detailText.textContent = `${message.character_count.toLocaleString("ja-JP")}文字・手動改行 ${message.line_break_count.toLocaleString("ja-JP")}箇所`;
    elements.detailAsset.textContent = message.asset ? message.asset.name : "なし";

    elements.prevButton.disabled = state.messageIndex === 0;
    elements.nextButton.disabled = state.messageIndex === channel.messages.length - 1;
    elements.chatThread.scrollTop = 0;

    const hash = `#${message.id}`;
    if (window.location.hash !== hash) {
      history.replaceState(null, "", hash);
    }

    document.querySelectorAll("#messageIndex button").forEach((button, index) => {
      const active = index === state.messageIndex;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "true" : "false");
      if (active) {
        button.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }

  function selectChannel(index, requestedMessageId) {
    state.channelIndex = index;
    const channel = currentChannel();
    const requestedIndex = requestedMessageId
      ? channel.messages.findIndex((message) => message.id === requestedMessageId)
      : -1;
    state.messageIndex = requestedIndex >= 0 ? requestedIndex : 0;
    buildChannelTabs();
    buildMessageIndex();
    renderMessage();
  }

  function selectMessage(index) {
    state.messageIndex = index;
    renderMessage();
  }

  function selectFromHash() {
    const requestedId = window.location.hash.slice(1);
    if (!requestedId) {
      selectChannel(0);
      return;
    }
    const channelIndex = data.channels.findIndex((channel) =>
      channel.messages.some((message) => message.id === requestedId),
    );
    selectChannel(channelIndex >= 0 ? channelIndex : 0, requestedId);
  }

  elements.deviceOptions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-width]");
    if (!button) return;
    const width = button.dataset.width;
    elements.phoneShell.style.setProperty("--device-width", `${width}px`);
    elements.deviceOptions.querySelectorAll("button").forEach((option) => {
      option.classList.toggle("is-active", option === button);
    });
  });

  elements.prevButton.addEventListener("click", () => {
    if (state.messageIndex > 0) selectMessage(state.messageIndex - 1);
  });

  elements.nextButton.addEventListener("click", () => {
    if (state.messageIndex < currentChannel().messages.length - 1) {
      selectMessage(state.messageIndex + 1);
    }
  });

  elements.imageMessage.addEventListener("click", () => {
    const message = currentMessage();
    if (!message.asset) return;
    elements.dialogImage.src = message.asset.path;
    elements.dialogCaption.textContent = message.asset.name;
    elements.imageDialog.showModal();
  });

  elements.dialogClose.addEventListener("click", () => elements.imageDialog.close());
  elements.imageDialog.addEventListener("click", (event) => {
    if (event.target === elements.imageDialog) elements.imageDialog.close();
  });

  window.addEventListener("hashchange", selectFromHash);
  selectFromHash();
})();
