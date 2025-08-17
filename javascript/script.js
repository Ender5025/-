// パスワード表示切替（目のアイコンの塗りつぶし＆斜線も切替）
function setupToggle(buttonId, inputId, eyeId) {
  const btn = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  const eye = document.getElementById(eyeId);
  let visible = false;

const eyeSlashSvg = `<path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/>`;
const eyeSvg = `<path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/>`;

  eye.innerHTML = eyeSlashSvg;
  btn.addEventListener("mousedown", e => e.preventDefault()); // ボタンのフォーカスを防ぐ
  btn.addEventListener("click", () => {
    visible = !visible;
    input.type = visible ? "text" : "password"; //条件 ? A : B は三項演算子
    eye.innerHTML = visible ? eyeSvg : eyeSlashSvg;
  });
}

setupToggle("toggleTextPassword", "textPassword", "eyeText");
setupToggle("toggleImagePassword", "imagePassword", "eyeImage");

// 文字列を20,000文字毎に改行,空白を入れる
function insertLineBreaks(text) {
  const maxChunk = 20000;
  let result = "";
  for (let i = 0; i < text.length; i += maxChunk) { //キストを20000文字ずつに分ける
    result += text.slice(i, i + maxChunk) + "\n ";
  }
  return result.trim();
}

// 操作を一括無効化・有効化
function setControlsDisabled(disabled) {
  [
    "imageInput", "encryptImageBtn", "decryptImageBtn",
    "textInput", "encryptTextBtn", "decryptTextBtn",
    "imagePassword", "textPassword",
    "toggleTextPassword", "toggleImagePassword",
    "imageResizeSlider", "imageResizeNumber"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

async function getKey(password) {
  const enc = new TextEncoder(); // TextEncoderを使って文字列をUint8Arrayに変換
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password), //バイト列に変換
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const salt = new Uint8Array(16);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
// 文字列データをパスワードで暗号化して、Base64形式にして返す
async function encryptData(data, password) {
  const key = await getKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  // Uint8Arrayを結合してBase64エンコード
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return insertLineBreaks(btoa(String.fromCharCode(...combined)));
}
//暗号化されたBase64形式の文字列を復号
async function decryptData(data, password) {
  const cleanedData = data.replace(/\s+/g, "");
  const combined = Uint8Array.from(atob(cleanedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const key = await getKey(password);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(decrypted);
}

function updateAllCharCounts() {
  document.getElementById("textInputCount").textContent = `${document.getElementById("textInput").value.length} 文字`;
  document.getElementById("textEncryptedCount").textContent = `${document.getElementById("textEncrypted").value.length} 文字`;
  document.getElementById("imageEncryptedCount").textContent = `${document.getElementById("imageEncrypted").value.length} 文字`;
}

// 文字列復号ボタン
document.getElementById("decryptTextBtn").addEventListener("click", async () => {
  const encrypted = document.getElementById("textEncrypted").value;
  const password = document.getElementById("textPassword").value;

  if (!encrypted) return alert("復号する暗号文を入力してください");
  if (!password) return alert("パスワードを入力してください");

  try {
    const decrypted = await decryptData(encrypted, password);
    document.getElementById("textInput").value = decrypted;
    updateAllCharCounts();
  } catch {
    alert("復号に失敗しました。パスワードが間違っているか、データが破損しています。");
  }
});


const imageInput = document.getElementById("imageInput");
const imageDropArea = document.getElementById("imageDropArea");
const imagePreview = document.getElementById("imagePreview");
const slider = document.getElementById("imageResizeSlider");
const numberInput = document.getElementById("imageResizeNumber");

let imageBase64 = "";
let originalImage = null;
let resizingInProgress = false;

async function handleImageLoad(base64) {
  imageBase64 = base64;
  imagePreview.src = imageBase64;
  originalImage = new Image();
  originalImage.src = imageBase64;
  await new Promise(r => originalImage.onload = r);

  // スライダーと数字入力を最大値(100)にリセット
  slider.value = 100;
  numberInput.value = 100;

  document.getElementById("imageEncrypted").value = "";
  updateAllCharCounts();

  // 元画像サイズを表示（画像サイズ更新）
  updateImageSize(100);
}

imageInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith("image/")) {
    alert("画像ファイルのみ対応しています");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    await handleImageLoad(reader.result);
  };
  reader.readAsDataURL(file);
});

imageDropArea.addEventListener("click", () => imageInput.click());
imageDropArea.addEventListener("dragover", e => {
  e.preventDefault();
  imageDropArea.classList.add("dragover");
});
imageDropArea.addEventListener("dragleave", e => {
  e.preventDefault();
  imageDropArea.classList.remove("dragover");
});
imageDropArea.addEventListener("drop", async e => {
  e.preventDefault();
  imageDropArea.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith("image/")) {
    alert("画像ファイルのみ対応しています");
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    await handleImageLoad(reader.result);
  };
  reader.readAsDataURL(file);
});

// 画像サイズ変更関数（パーセンテージ）
async function updateImageSize(percentage) {
  if (!originalImage) return;
  if (resizingInProgress) return;

  resizingInProgress = true;
  setControlsDisabled(true);

  try {
    const scale = percentage / 100;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

const width = Math.floor(originalImage.width * scale);
const height = Math.floor(originalImage.height * scale);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(originalImage, 0, 0, width, height);

    const resizedBase64 = canvas.toDataURL("image/jpeg", 0.8);
    imageBase64 = resizedBase64;
    imagePreview.src = imageBase64;
    document.getElementById("imageEncrypted").value = "";
    updateAllCharCounts();
  } catch(e) {
    alert("画像縮小中にエラーが発生しました: " + e.message);
  }

  resizingInProgress = false;
  setControlsDisabled(false);
}

// スライダーと数字入力の連動＆画像サイズ変更
slider.addEventListener("change", () => {
  const val = slider.value;
  numberInput.value = val;
  updateImageSize(val);
});

// 数値入力時はinputでスライダーに反映（空欄は無視）
numberInput.addEventListener("input", () => {
  const val = numberInput.value;
  if (val === "") return;
  if (/^\d+(\.\d+)?$/.test(val)) { // 小数点も許可
    slider.value = val;
    updateImageSize(val);
  }
});

// 数値入力のchangeで範囲チェック・補正（1～100、無効なら100）
numberInput.addEventListener("change", () => {
  let val = parseFloat(numberInput.value);
  if (isNaN(val) || val < 1) val = 100;
  else if (val > 100) val = 100;
  numberInput.value = val;
  slider.value = val;
  updateImageSize(val);
});

// 文字列暗号化ボタン
document.getElementById("encryptTextBtn").addEventListener("click", async () => {
  const input = document.getElementById("textInput").value;
  const password = document.getElementById("textPassword").value;
  if (!input) return alert("暗号化する文字列を入力してください");
  if (!password) return alert("パスワードを入力してください");
  try {
    const encrypted = await encryptData(input, password);
    document.getElementById("textEncrypted").value = encrypted;
    updateAllCharCounts();
  } catch (e) {
    alert("暗号化に失敗しました: " + e.message);
  }
});

// 画像復号ボタン
document.getElementById("decryptImageBtn").addEventListener("click", async () => {
  const encrypted = document.getElementById("imageEncrypted").value;
  const password = document.getElementById("imagePassword").value;
  if (!encrypted) return alert("復号する暗号文を入力してください");
  if (!password) return alert("パスワードを入力してください");
  try {
    const decrypted = await decryptData(encrypted, password);
    imageBase64 = decrypted;
    imagePreview.src = imageBase64;
    // ここを追加
    originalImage = new Image();
    originalImage.src = imageBase64;
    await new Promise(r => originalImage.onload = r);

    updateAllCharCounts();

    // 復号後はスライダーと数値を最大（100%）にリセット
    slider.value = 100;
    numberInput.value = 100;
  } catch {
    alert("復号に失敗しました。パスワードが間違っているか、データが破損しています。");
  }
});

function handleImageCrypto(mode) {
  const password = document.getElementById("imagePassword").value;
  const textarea = document.getElementById("imageEncrypted");

  if (!password) return alert("パスワードを入力してください");

  if (mode === "encrypt") {
    if (!imageBase64) return alert("画像を選択してください");
    encryptData(imageBase64, password).then(encrypted => {
      textarea.value = encrypted;
      updateAllCharCounts();
    }).catch(e => {
      alert("画像の暗号化に失敗しました: " + e.message);
    });
  } else if (mode === "decrypt") {
    const encrypted = textarea.value;
    if (!encrypted) return alert("復号する暗号文を入力してください");
    decryptData(encrypted, password).then(decrypted => {
      imageBase64 = decrypted;
      imagePreview.src = imageBase64;
      updateAllCharCounts();
      slider.value = 100;
      numberInput.value = 100;
    }).catch(() => {
      alert("復号に失敗しました。パスワードが間違っているか、データが破損しています。");
    });
  }
}

document.getElementById("encryptImageBtn").addEventListener("click", () => handleImageCrypto("encrypt"));
document.getElementById("decryptImageBtn").addEventListener("click", () => handleImageCrypto("decrypt"));


// 文字数カウント更新
document.getElementById("textInput").addEventListener("input", updateAllCharCounts);
document.getElementById("textEncrypted").addEventListener("input", updateAllCharCounts);
document.getElementById("imageEncrypted").addEventListener("input", updateAllCharCounts);

// 画像プレビュー用初期化
window.addEventListener("load", () => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  imageBase64 = canvas.toDataURL("image/png");
  imagePreview.src = imageBase64;

  slider.value = 100;
  numberInput.value = 100;

  updateAllCharCounts();
});

//コピーボタン(文字)
document.addEventListener('DOMContentLoaded', () => {
  const copyTextBtn = document.getElementById('copyTextEncrypted');
  const textEncrypted = document.getElementById('textEncrypted');
  copyTextBtn.addEventListener('click', () => {
//Clipボードにコピーできなければアラートを実行。そしてここで終わる。
    if (!navigator.clipboard) {
      alert("このブラウザは対応していません");
      return;
    }

    const text = textEncrypted.value || textEncrypted.textContent; //論理和演算子

    if (!text || text.trim() === "") {
  alert("コピーする文字列がありません");
  return;
}

    navigator.clipboard.writeText(text).then(
      () => alert('コピー成功'),
      () => alert('コピー失敗')
    );
  });
});

//コピーボタン(画像)
document.addEventListener('DOMContentLoaded', () => {
  const copyImageBtn = document.getElementById('copyImageEncrypted');
  const imageEncrypted = document.getElementById('imageEncrypted');
  copyImageBtn.addEventListener('click', () => {
    if (!navigator.clipboard) {
      alert("このブラウザは対応していません");
      return;
    }

    const text = imageEncrypted.value || imageEncrypted.textContent;

    if (!text || text.trim() === "") {
      alert("コピーする文字列がありません");
      return;
    }

    navigator.clipboard.writeText(text).then(
      () => alert('コピー成功'),
      () => alert('コピー失敗')
    );
  });
});
