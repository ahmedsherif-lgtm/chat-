import { supabase } from "./supabase.js";

// ======================================
// 1) ربط عناصر صفحة تسجيل الدخول
// ======================================

const loginScreen = document.getElementById("login-screen");
const chatScreen = document.getElementById("chat-screen");

const loginForm = document.getElementById("login-form");
const referenceCodeInput = document.getElementById("reference-code");
const loginButton = document.getElementById("login-button");
const loginError = document.getElementById("login-error");

const currentUserName = document.getElementById("current-user-name");
const logoutButton = document.getElementById("logout-button");

// ======================================
// 1.1) ربط عناصر المرفقات (الصور والملفات)
// ======================================

const imageButton = document.getElementById("image-button");
const imageInput = document.getElementById("image-input");

const fileButton = document.getElementById("file-button");
const fileInput = document.getElementById("file-input");

const attachmentPreview = document.getElementById("attachment-preview");
const attachmentPreviewContent = document.getElementById("attachment-preview-content");
const removeAttachmentButton = document.getElementById("remove-attachment-button");

// ======================================
// 1.2) ربط عناصر التسجيل الصوتي
// ======================================

const voiceButton = document.getElementById("voice-button");
const recordingIndicator = document.getElementById("recording-indicator");
const recordingTime = document.getElementById("recording-time");
const cancelRecordingButton = document.getElementById("cancel-recording-button");

// ======================================
// 2) متغيرات المستخدم والمحادثة
// ======================================

let currentUser = null;
let currentConversationId = null;
let currentSelectedFile = null;

// متغيرات التسجيل الصوتي
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let recordingSeconds = 0;
let isCancelled = false;

// ======================================
// 3) إظهار رسالة الخطأ
// ======================================

function showLoginError(message) {
    if (loginError) {
        loginError.textContent = message;
        loginError.style.display = "block";
    }
}

// ======================================
// 4) إخفاء رسالة الخطأ
// ======================================

function hideLoginError() {
    if (loginError) {
        loginError.textContent = "";
        loginError.style.display = "none";
    }
}

// ======================================
// 5) الانتقال إلى واجهة المحادثة
// ======================================

function showChatScreen() {
    if (loginScreen) {
        loginScreen.style.display = "none";
    }

    if (chatScreen) {
        chatScreen.style.display = "flex";
        chatScreen.style.visibility = "visible";
        chatScreen.style.opacity = "1";
    }

    if (currentUserName && currentUser) {
        currentUserName.textContent =
            currentUser.user_metadata?.display_name || "مستخدم";
    }
}

// ======================================
// 6) إظهار صفحة تسجيل الدخول
// ======================================

function showLoginScreen() {
    if (chatScreen) {
        chatScreen.style.display = "none";
    }

    if (loginScreen) {
        loginScreen.style.display = "flex";
    }
}

// ======================================
// 7) تسجيل الدخول المجهول
// ======================================

async function signInAnonymously() {
    const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

    if (sessionError) {
        throw sessionError;
    }

    if (sessionData.session) {
        currentUser = sessionData.session.user;
        return currentUser;
    }

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
        throw error;
    }

    currentUser = data.user;

    if (!currentUser) {
        throw new Error("لم يتم إنشاء حساب المستخدم.");
    }

    return currentUser;
}

// ======================================
// 8) التحقق من كود المحادثة والانضمام
// ======================================

async function joinPrivateChat(code) {
    const { data, error } = await supabase.rpc(
        "join_private_chat",
        {
            p_code: code
        }
    );

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("تعذر العثور على المحادثة.");
    }

    currentConversationId = data;

    return data;
}

// ======================================
// 9) تنفيذ تسجيل الدخول عند إرسال النموذج
// ======================================

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    hideLoginError();

    const code = referenceCodeInput?.value.trim();

    if (!code) {
        showLoginError("من فضلك اكتب كود الدخول.");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "جارٍ تسجيل الدخول...";

    try {
        await signInAnonymously();
        await joinPrivateChat(code);

        showChatScreen();
        await loadMessages();
        subscribeToMessages();

        console.log("تم تسجيل الدخول والانضمام بنجاح.");
        console.log("معرّف المحادثة:", currentConversationId);

    } catch (error) {
        console.error("Login error:", error);

        showLoginError(
            error.message || "حدث خطأ أثناء تسجيل الدخول."
        );

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "دخول";
    }
});

// ======================================
// 10) تسجيل الخروج
// ======================================

logoutButton?.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        showLoginError("تعذر تسجيل الخروج. حاول مرة أخرى.");
        return;
    }

    currentUser = null;
    currentConversationId = null;

    if (referenceCodeInput) {
        referenceCodeInput.value = "";
    }

    showLoginScreen();
});

// ======================================
// 11) بدء التطبيق
// ======================================

async function initializeApp() {
    try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            throw error;
        }

        if (data.session) {
            currentUser = data.session.user;
            showLoginScreen();
        } else {
            showLoginScreen();
        }

    } catch (error) {
        console.error("Initialization error:", error);
        showLoginScreen();
    }
}

initializeApp();

// ======================================
// 11.1) إدارة اختيار وإلغاء المرفقات ومعاينتها
// ======================================

imageButton?.addEventListener("click", () => imageInput?.click());
fileButton?.addEventListener("click", () => fileInput?.click());

function handleFileSelect(file) {
    if (!file) return;
    currentSelectedFile = file;

    if (attachmentPreviewContent) {
        attachmentPreviewContent.innerHTML = "";

        if (file.type.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.style.maxHeight = "60px";
            img.style.borderRadius = "6px";
            attachmentPreviewContent.appendChild(img);
        } else {
            const span = document.createElement("span");
            span.textContent = `📁 ${file.name}`;
            span.style.fontSize = "14px";
            attachmentPreviewContent.appendChild(span);
        }
    }

    if (attachmentPreview) {
        attachmentPreview.hidden = false;
    }
}

imageInput?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
    }
});

fileInput?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
    }
});

function resetAttachment() {
    currentSelectedFile = null;
    if (imageInput) imageInput.value = "";
    if (fileInput) fileInput.value = "";
    if (attachmentPreviewContent) attachmentPreviewContent.innerHTML = "";
    if (attachmentPreview) attachmentPreview.hidden = true;
}

removeAttachmentButton?.addEventListener("click", resetAttachment);

// ======================================
// 11.2) التسجيل الصوتي
// ======================================

function resetRecordingUI() {
    if (recordingIndicator) recordingIndicator.hidden = true;
    if (recordingTime) recordingTime.textContent = "00:00";
    recordingSeconds = 0;
    clearInterval(recordingInterval);
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        isCancelled = false;

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            stream.getTracks().forEach((track) => track.stop());
            clearInterval(recordingInterval);

            if (isCancelled) {
                resetRecordingUI();
                return;
            }

            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            const voiceFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: "audio/webm" });

            await sendVoiceMessage(voiceFile);
            resetRecordingUI();
        };

        mediaRecorder.start();
        recordingSeconds = 0;
        if (recordingIndicator) recordingIndicator.hidden = false;

        recordingInterval = setInterval(() => {
            recordingSeconds++;
            const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, "0");
            const secs = String(recordingSeconds % 60).padStart(2, "0");
            if (recordingTime) recordingTime.textContent = `${mins}:${secs}`;
        }, 1000);

    } catch (err) {
        console.error("Mic access error:", err);
        alert("تعذر الوصول إلى المايكروفون. تأكد من إعطاء الصلاحيات في المتصفح.");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
}

voiceButton?.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        stopRecording();
    } else {
        startRecording();
    }
});

cancelRecordingButton?.addEventListener("click", () => {
    isCancelled = true;
    stopRecording();
});

async function sendVoiceMessage(file) {
    if (!currentUser || !currentConversationId) return;

    try {
        const uploadResult = await uploadFileToStorage(file);
        const senderName =
            currentUser.user_metadata?.display_name ||
            "مستخدم-" + currentUser.id.slice(0, 4);

        const { error } = await supabase.from("messages").insert({
            conversation_id: currentConversationId,
            sender_id: currentUser.id,
            sender_name: senderName,
            message_type: "voice",
            body: "🎤 رسالة صوتية",
            file_url: uploadResult.url,
            file_type: uploadResult.type
        });

        if (error) throw error;
    } catch (err) {
        console.error("Voice send error:", err);
        alert("تعذر إرسال الرسالة الصوتية.");
    }
}

// ======================================
// 11.3) دالة رفع الملف إلى Supabase Storage
// ======================================

async function uploadFileToStorage(file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
        .from("chat-files")
        .upload(filePath, file);

    if (error) {
        throw new Error("تعذر رفع الملف: " + error.message);
    }

    const { data: publicUrlData } = supabase.storage
        .from("chat-files")
        .getPublicUrl(filePath);

    return {
        url: publicUrlData.publicUrl,
        type: file.type
    };
}

/* ======================================
   12) عرض الرسائل داخل نافذة المحادثة
====================================== */

const messagesContainer = document.getElementById("messages-container");

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

let messagesChannel = null;

function renderMessage(message) {
    if (!messagesContainer || !currentUser) return;

    if (document.querySelector(`[data-message-id="${message.id}"]`)) {
        return;
    }

    const messageElement = document.createElement("div");
    messageElement.classList.add("message");

    const isMine = message.sender_id === currentUser.id;

    messageElement.classList.add(
        isMine ? "sent" : "received"
    );

    messageElement.dataset.messageId = message.id;

    const senderElement = document.createElement("div");
    senderElement.className = "message-sender";
    senderElement.textContent = isMine
        ? "أنت"
        : message.sender_name;

    const bodyElement = document.createElement("div");
    bodyElement.className = "message-text";

    bodyElement.textContent = message.body || "";

    // عرض المرفقات (صورة / ملف / تسجيل صوتي)
    if (message.file_url) {
        const attachmentContainer = document.createElement("div");
        attachmentContainer.className = "message-attachment";
        attachmentContainer.style.marginTop = "6px";

        if (message.message_type === "voice" || (message.file_type && message.file_type.startsWith("audio/"))) {
            // مشغل الصوت للرسائل الصوتية
            const audio = document.createElement("audio");
            audio.src = message.file_url;
            audio.controls = true;
            audio.style.maxWidth = "240px";
            audio.style.display = "block";
            attachmentContainer.appendChild(audio);
        } else if (message.file_type && message.file_type.startsWith("image/")) {
            // المعاينة للصور
            const img = document.createElement("img");
            img.src = message.file_url;
            img.alt = "صورة مرفقة";
            img.style.maxWidth = "200px";
            img.style.borderRadius = "8px";
            img.style.display = "block";
            attachmentContainer.appendChild(img);
        } else {
            // رابط تحميل الملفات المستندية
            const link = document.createElement("a");
            link.href = message.file_url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.style.color = "#007bff";
            link.style.display = "inline-block";
            link.style.textDecoration = "underline";
            link.innerHTML = `<i class="fa-solid fa-file-arrow-down"></i> تحميل الملف`;
            attachmentContainer.appendChild(link);
        }

        bodyElement.appendChild(attachmentContainer);
    }

    const timeElement = document.createElement("div");
    timeElement.className = "message-time";

    timeElement.textContent = new Date(
        message.created_at
    ).toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit"
    });

    messageElement.append(
        senderElement,
        bodyElement,
        timeElement
    );

    const welcomeMessage = messagesContainer.querySelector(
        ".welcome-message"
    );

    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    messagesContainer.appendChild(messageElement);

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}

/* ======================================
   13) تحميل الرسائل السابقة
====================================== */

async function loadMessages() {
    if (!currentConversationId || !messagesContainer) return;

    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", currentConversationId)
        .order("created_at", { ascending: true })
        .limit(100);

    if (error) {
        console.error("Messages loading error:", error);
        showLoginError("تعذر تحميل الرسائل. حاول تحديث الصفحة.");
        return;
    }

    messagesContainer.replaceChildren();

    if (!data || data.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "welcome-message";
        emptyMessage.textContent = "لا توجد رسائل بعد. ابدأ المحادثة!";
        messagesContainer.appendChild(emptyMessage);
        return;
    }

    data.forEach(renderMessage);
}

/* ======================================
   14) استقبال الرسائل الجديدة لحظيًا
====================================== */

function subscribeToMessages() {
    if (!currentConversationId) return;

    if (messagesChannel) {
        supabase.removeChannel(messagesChannel);
        messagesChannel = null;
    }

    messagesChannel = supabase
        .channel("chat-messages-" + currentConversationId)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: "conversation_id=eq." + currentConversationId
            },
            (payload) => {
                renderMessage(payload.new);
            }
        )
        .subscribe((status) => {
            console.log("Realtime status:", status);
        });
}

/* ======================================
   15) إرسال رسالة نصية أو ملف/صورة
====================================== */

messageForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser || !currentConversationId) {
        showLoginError("سجّل الدخول أولًا.");
        return;
    }

    const body = messageInput?.value.trim();

    if (!body && !currentSelectedFile) return;

    sendButton.disabled = true;

    try {
        let uploadedFileUrl = null;
        let uploadedFileType = null;

        if (currentSelectedFile) {
            const uploadResult = await uploadFileToStorage(currentSelectedFile);
            uploadedFileUrl = uploadResult.url;
            uploadedFileType = uploadResult.type;
        }

        const senderName =
            currentUser.user_metadata?.display_name ||
            "مستخدم-" + currentUser.id.slice(0, 4);

        let msgType = "text";
        if (currentSelectedFile) {
            msgType = currentSelectedFile.type.startsWith("image/") ? "image" : "file";
        }

        const { error } = await supabase
            .from("messages")
            .insert({
                conversation_id: currentConversationId,
                sender_id: currentUser.id,
                sender_name: senderName,
                message_type: msgType,
                body: body || (msgType === "image" ? "📷 صورة" : "📁 ملف"),
                file_url: uploadedFileUrl,
                file_type: uploadedFileType
            });

        if (error) throw error;

        if (messageInput) messageInput.value = "";
        resetAttachment();
        messageInput?.focus();

    } catch (error) {
        console.error("Send message error:", error);
        alert(error.message || "لم يتم إرسال الرسالة. تأكد من الاتصال وحاول مرة أخرى.");

    } finally {
        sendButton.disabled = false;
    }
});