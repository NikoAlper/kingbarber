const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

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

  const staleTokens = [];
  response.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (!r.success && (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token")) {
      staleTokens.push(tokens[i]);
    }
  });
  await Promise.all(staleTokens.map((t) => db.collection("fcmTokens").doc(t).delete()));
});
