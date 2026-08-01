const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const REGION = "europe-west1";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Müşteri tarafındaki takvim için: hangi saatler hangi berberde dolu.
// Sadece { time, barber, status } döner — isim/telefon/not gibi kişisel
// veriler client'a asla gönderilmez (appointments koleksiyonu artık
// doğrudan client'tan okunamıyor, bkz. firestore.rules).
exports.getBusySlots = onCall({ region: REGION }, async (request) => {
  const date = request.data && request.data.date;
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    throw new HttpsError("invalid-argument", "Geçersiz tarih formatı.");
  }

  const db = getFirestore();
  const [apptSnap, blockedSnap] = await Promise.all([
    db.collection("appointments").where("date", "==", date).get(),
    db.collection("blockedSlots").where("date", "==", date).get(),
  ]);

  const byTime = {};
  apptSnap.forEach((doc) => {
    const data = doc.data();
    if (data.status === "rejected") return;
    if (!byTime[data.time]) byTime[data.time] = [];
    byTime[data.time].push(data.barber);
  });
  // Berberin kendi kapattığı saatler de "dolu" gibi davranır.
  blockedSnap.forEach((doc) => {
    const data = doc.data();
    if (!byTime[data.time]) byTime[data.time] = [];
    byTime[data.time].push(data.barber);
  });

  return { byTime };
});

const BARBER_LABELS = {
  fatihtuncer: "Fatih Tuncer",
  usta1: "Şemsettin Sancak",
  usta2: "Furkan Ormankaya",
  usta3: "Berat Özbakır",
};

exports.onNewAppointment = onDocumentCreated("appointments/{appointmentId}", async (event) => {
  const appt = event.data.data();
  const db = getFirestore();

  const tokensSnap = await db.collection("fcmTokens").get();
  const tokens = tokensSnap.docs.map((d) => d.id);
  logger.info(`onNewAppointment: ${tokens.length} kayıtlı token bulundu.`);
  if (!tokens.length) return;

  const barberName = BARBER_LABELS[appt.barber] || appt.barber || "";
  const body = [appt.name, appt.date, appt.time, barberName].filter(Boolean).join(" · ");

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: {
      title: "Yeni Randevu",
      body: body || "Yeni bir randevu oluşturuldu.",
    },
    webpush: {
      notification: {
        icon: "/icons/logo-192.png",
      },
    },
  });

  logger.info(`onNewAppointment: ${response.successCount} başarılı, ${response.failureCount} başarısız gönderim.`);
  response.responses.forEach((r, i) => {
    if (!r.success) {
      logger.warn(`onNewAppointment: token ${tokens[i]} gönderim hatası: ${r.error && r.error.code} - ${r.error && r.error.message}`);
    }
  });

  const staleTokens = [];
  response.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (!r.success && (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token")) {
      staleTokens.push(tokens[i]);
    }
  });
  await Promise.all(staleTokens.map((t) => db.collection("fcmTokens").doc(t).delete()));
});
