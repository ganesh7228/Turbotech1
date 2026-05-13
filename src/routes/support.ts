import type { Express, Request, Response } from "express";
import axios from "axios";
import {
  handleSupportCallback,
  type SupportNodeId,
  type SupportResponse,
} from "../lib/support/supportLogic.ts";
import { SupportSessionStore } from "../lib/support/supportSessionStore.ts";

type TelegramUpdate = any;

function makeButtons(resp: SupportResponse) {
  return {
    text: resp.text,
    buttons: resp.buttons.map((b) => ({
      label: b.label,
      callbackData: b.callbackData,
    })),
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export function registerSupportRoutes(
  app: Express,
  deps: {
    telegramToken: string;
    adminChatId: string;
    botChatId: string;
    sessionStore?: SupportSessionStore;
    db?: any; // Firestore instance from server.ts
  }
) {
  const sessionStore = deps.sessionStore ?? new SupportSessionStore();

  const sendTelegramMessage = async (chatId: string, text: string) => {
    const url = `https://api.telegram.org/bot${deps.telegramToken}/sendMessage`;
    await axios.post(url, { chat_id: chatId, text });
  };

  const sendAdminLog = async (payload: string) => {
    try {
      await sendTelegramMessage(deps.adminChatId, payload);
    } catch {
      // ignore
    }
  };

  const persistSupportUser = async (args: {
    channel: "telegram" | "web";
    userKey: string;
    phone?: string;
    name?: string;
  }) => {
    if (!deps.db) return;
    try {
      const now = new Date().toISOString();
      await deps.db.collection("support_users").doc(args.userKey).set(
        {
          userKey: args.userKey,
          channel: args.channel,
          phone: args.phone ?? null,
          name: args.name ?? null,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch {
      // best-effort
    }
  };

  const persistSupportConversation = async (args: {
    channel: "telegram" | "web";
    sessionId: string;
    userMessage: string;
    botReply: string;
    phone?: string;
    name?: string;
    nodeId?: SupportNodeId | null;
  }) => {
    if (!deps.db) return;
    try {
      await deps.db.collection("support_conversations").add({
        channel: args.channel,
        sessionId: args.sessionId,
        name: args.name ?? null,
        phone: args.phone ?? null,
        userMessage: args.userMessage,
        botReply: args.botReply,
        nodeId: args.nodeId ?? null,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // best-effort
    }
  };

  const logConversation = async (args: {
    channel: "telegram" | "web";
    adminChatId: string;
    name?: string;
    phone?: string;
    userMessage: string;
    botReply: string;
    sessionId: string;
    nodeId?: SupportNodeId | null;
    persistUserKey?: string; // optional: used to persist support_users
  }) => {
    const safeName = args.name && args.name.trim() ? args.name.trim() : "Not Provided";
    const safePhone = args.phone && args.phone.trim() ? args.phone.trim() : "";

    const payload =
      `📩 New Conversation\n\n` +
      `👤 Name: ${safeName}\n` +
      `📱 Phone: ${safePhone}\n\n` +
      `💬 User Message: ${args.userMessage}\n\n` +
      `## 🤖 Bot Reply: \n\n` +
      `${args.botReply}\n\n` +
      `## Session: ${args.sessionId}`;

    // Telegram admin notify (required)
    void sendAdminLog(payload);

    // Firestore persistence (best-effort)
    await persistSupportConversation({
      channel: args.channel,
      sessionId: args.sessionId,
      name: safeName !== "Not Provided" ? safeName : undefined,
      phone: safePhone || undefined,
      userMessage: args.userMessage,
      botReply: args.botReply,
      nodeId: args.nodeId ?? null,
    });

    if (args.persistUserKey && (args.phone || args.name)) {
      await persistSupportUser({
        channel: args.channel,
        userKey: args.persistUserKey,
        phone: args.phone,
        name: args.name,
      });
    }
  };

  const allowedMenuNodes: Set<SupportNodeId> = new Set([
    "main",
    "booked_services",
    "free_gift_support",
    "payments_refunds",
    "technical_support",
    "account",
    "contact_support",
    "booking_check_status",
    "booking_not_completed",
    "booking_cancel",
    "booking_details",
    "gift_not_received",
    "gift_marked_delivered_not_received",
    "gift_cancel",
    "gift_info",
    "refund_status",
    "payment_failed",
    "amount_deducted",
    "laptop_issue",
    "virus_security",
    "website_issue",
    "other_issue",
    "login_issue",
    "update_phone",
    "update_email",
    "unknown",
  ]);

  const getNodeFromWebsiteMessage = (message: string): SupportNodeId => {
    const candidate = String(message).trim() as SupportNodeId;
    return allowedMenuNodes.has(candidate) ? candidate : ("unknown" as SupportNodeId);
  };

  const isPhoneStep = (stage: string) => stage === "awaiting_phone";
  const isNameStep = (stage: string) => stage === "awaiting_name";
  const isReadyMenuStep = (stage: string) => stage === "ready_menu";

  const isContactStep = (stage: string) =>
    stage === "contact_name_expected" ||
    stage === "contact_phone_expected" ||
    stage === "contact_issue_expected";

  const startFlowIfIdle = (sessionKey: string) => {
    const session = sessionStore.get(sessionKey);
    if (session.stage === "idle") sessionStore.startOnboarding(sessionKey);
  };

  const handleMenuNode = async (args: {
    sessionKey: string;
    nodeId: SupportNodeId;
    session: any;
    userMessage: string;
  }) => {
    const resp = handleSupportCallback(args.nodeId);
    return resp;
  };

  const handleContactStep = async (args: {
    sessionKey: string;
    stage: string;
    userMessage: string;
    session: any;
  }) => {
    const { contact, done } = sessionStore.recordContactInput(args.sessionKey, args.userMessage);

    if (!done) {
      if (args.stage === "contact_name_expected") {
        return {
          text: "📱 Please enter your phone number.",
          buttons: [{ label: "⬅ Back", callbackData: "main" as SupportNodeId }],
        };
      }
      if (args.stage === "contact_phone_expected") {
        return {
          text: "📝 Please describe your issue.",
          buttons: [{ label: "⬅ Back", callbackData: "main" as SupportNodeId }],
        };
      }
    }

    const botText = "✅ Thanks! We’ve received your request. Our team will contact you shortly.";

    return {
      text: botText,
      buttons: [{ label: "⬅ Back", callbackData: "main" as SupportNodeId }],
      contact,
    };
  };

  const handleWebsiteMessage = async (req: Request, res: Response) => {
    const { userId, message } = req.body as { userId?: string; message?: string };
    const sessionKey = userId ? String(userId) : "anonymous-web";

    const userMessage = typeof message === "string" ? message : "";
    if (!userMessage.trim()) return res.status(400).json({ error: "message is required" });

    startFlowIfIdle(sessionKey);

    const session = sessionStore.get(sessionKey);

    // STEP 1: phone mandatory
    if (isPhoneStep(session.stage)) {
      const phone = normalizePhone(userMessage);

      if (phone.length !== 10) {
        const botReply = "📱 Please enter your phone number.";
        await logConversation({
          channel: "web",
          adminChatId: deps.adminChatId,
          name: undefined,
          phone: phone.length ? phone : undefined,
          userMessage,
          botReply,
          sessionId: sessionKey,
          nodeId: null,
        });

        return res.json({ text: botReply, buttons: [] });
      }

      sessionStore.setPhoneAndMaybeName(sessionKey, phone, undefined);

      const botReply = "👤 Please enter your name";
      await logConversation({
        channel: "web",
        adminChatId: deps.adminChatId,
        name: undefined,
        phone,
        userMessage,
        botReply,
        sessionId: sessionKey,
        nodeId: null,
        persistUserKey: `web:${phone}`,
      });

      return res.json({ text: botReply, buttons: [{ label: "⬅ Back", callbackData: "main" as SupportNodeId }] });
    }

    // STEP 2: name
    if (isNameStep(session.stage)) {
      const name = userMessage.trim();
      sessionStore.setName(sessionKey, name);

      const resp = handleSupportCallback("main");

      await logConversation({
        channel: "web",
        adminChatId: deps.adminChatId,
        name,
        phone: session.phone,
        userMessage,
        botReply: resp.text,
        sessionId: sessionKey,
        nodeId: "main",
        persistUserKey: `web:${session.phone ?? ""}`,
      });

      return res.json(makeButtons(resp));
    }

    // ready menu
    if (isReadyMenuStep(session.stage)) {
      const nodeId = getNodeFromWebsiteMessage(userMessage);

      if (nodeId === "contact_support") {
        sessionStore.startContact(sessionKey);
        const resp = handleSupportCallback("contact_support");

        await logConversation({
          channel: "web",
          adminChatId: deps.adminChatId,
          name: session.name,
          phone: session.phone,
          userMessage,
          botReply: resp.text,
          sessionId: sessionKey,
          nodeId,
          persistUserKey: `web:${session.phone ?? ""}`,
        });

        return res.json(makeButtons(resp));
      }

      const resp = await handleMenuNode({ sessionKey, nodeId, session, userMessage });

      await logConversation({
        channel: "web",
        adminChatId: deps.adminChatId,
        name: session.name,
        phone: session.phone,
        userMessage,
        botReply: resp.text,
        sessionId: sessionKey,
        nodeId,
        persistUserKey: `web:${session.phone ?? ""}`,
      });

      return res.json(makeButtons(resp));
    }

    // Contact Support steps
    if (isContactStep(session.stage)) {
      const result = await handleContactStep({
        sessionKey,
        stage: session.stage,
        userMessage,
        session,
      });

      const nodeId = null;

      await logConversation({
        channel: "web",
        adminChatId: deps.adminChatId,
        name: session.name,
        phone: session.phone,
        userMessage,
        botReply: result.text,
        sessionId: sessionKey,
        nodeId,
        persistUserKey: `web:${session.phone ?? ""}`,
      });

      // On completion, also notify user we’re done (buttons already included)
      if (result.contact && result.text.startsWith("✅")) {
        sessionStore.reset(sessionKey);
      }

      return res.json({ text: result.text, buttons: result.buttons });
    }

    // Fallback: restart onboarding
    sessionStore.reset(sessionKey);
    sessionStore.startOnboarding(sessionKey);

    const botReply = "📱 Please enter your phone number.";
    await logConversation({
      channel: "web",
      adminChatId: deps.adminChatId,
      name: undefined,
      phone: undefined,
      userMessage,
      botReply,
      sessionId: sessionKey,
      nodeId: null,
    });

    return res.json({ text: botReply, buttons: [] });
  };

  app.post("/api/support/chat", handleWebsiteMessage);

  // Telegram webhook
  app.post("/api/support/telegram-webhook", async (req: Request, res: Response) => {
    const update: TelegramUpdate = req.body;

    try {
      // Callback-based buttons
      if (update?.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId = String(callbackQuery.message?.chat?.id ?? deps.botChatId);
        const nodeId = String(callbackQuery.data ?? "main") as SupportNodeId;

        const sessionKey = `tg:${callbackQuery.from?.id ?? chatId}`;
        const session = sessionStore.get(sessionKey);

        if (!isReadyMenuStep(session.stage)) {
          let botReply = "📱 Please enter your phone number.";
          if (isNameStep(session.stage)) botReply = "👤 Please enter your name";
          if (isContactStep(session.stage)) botReply = "ℹ️ Please follow the prompts for Contact Support.";

          await sendTelegramMessage(chatId, botReply);

          await logConversation({
            channel: "telegram",
            adminChatId: deps.adminChatId,
            name: session.name,
            phone: session.phone,
            userMessage: String(callbackQuery.data ?? ""),
            botReply,
            sessionId: sessionKey,
            nodeId: null,
          });

          return res.json({ ok: true });
        }

        if (nodeId === "contact_support") {
          sessionStore.startContact(sessionKey);
          const resp = handleSupportCallback("contact_support");
          await sendTelegramMessage(chatId, resp.text);

          await logConversation({
            channel: "telegram",
            adminChatId: deps.adminChatId,
            name: session.name,
            phone: session.phone,
            userMessage: String(callbackQuery.data ?? ""),
            botReply: resp.text,
            sessionId: sessionKey,
            nodeId,
            persistUserKey: session.phone ? `tg:${session.phone}` : undefined,
          });

          return res.json({ ok: true });
        }

        const resp = handleSupportCallback(nodeId);
        await sendTelegramMessage(chatId, resp.text);

        await logConversation({
          channel: "telegram",
          adminChatId: deps.adminChatId,
          name: session.name,
          phone: session.phone,
          userMessage: String(callbackQuery.data ?? ""),
          botReply: resp.text,
          sessionId: sessionKey,
          nodeId,
          persistUserKey: session.phone ? `tg:${session.phone}` : undefined,
        });

        return res.json({ ok: true });
      }

      // Text messages
      if (update?.message?.text) {
        const userMessage = String(update.message.text ?? "");
        const chatId = String(update.message.chat?.id ?? deps.botChatId);

        const from = update.message.from ?? {};
        const firstName = typeof from.first_name === "string" ? from.first_name : "";
        const lastName = typeof from.last_name === "string" ? from.last_name : "";
        const profileName = `${firstName} ${lastName}`.trim();

        const sessionKey = `tg:${from?.id ?? chatId}`;
        const session = sessionStore.get(sessionKey);

        startFlowIfIdle(sessionKey);
        const updatedSession = sessionStore.get(sessionKey);

        // Phone step
        if (isPhoneStep(updatedSession.stage)) {
          const phone = normalizePhone(userMessage);

          if (phone.length !== 10) {
            const botReply = "📱 Please enter your phone number to continue.";
            await sendTelegramMessage(chatId, botReply);

            await logConversation({
              channel: "telegram",
              adminChatId: deps.adminChatId,
              name: undefined,
              phone: phone.length ? phone : undefined,
              userMessage,
              botReply,
              sessionId: sessionKey,
              nodeId: null,
            });

            return res.json({ ok: true });
          }

          if (profileName) {
            sessionStore.setPhoneAndMaybeName(sessionKey, phone, profileName);
            await sendTelegramMessage(
              chatId,
              `👋 Hi, ${profileName} you are connected to TurboTech Support. How can we help you?`
            );

            const resp = handleSupportCallback("main");
            await sendTelegramMessage(chatId, resp.text);

            await logConversation({
              channel: "telegram",
              adminChatId: deps.adminChatId,
              name: profileName,
              phone,
              userMessage,
              botReply: resp.text,
              sessionId: sessionKey,
              nodeId: "main",
              persistUserKey: `tg:${phone}`,
            });

            return res.json({ ok: true });
          }

          sessionStore.setPhoneAndMaybeName(sessionKey, phone, undefined);
          const botReply = "👤 Please enter your name";
          await sendTelegramMessage(chatId, botReply);

          await logConversation({
            channel: "telegram",
            adminChatId: deps.adminChatId,
            name: undefined,
            phone,
            userMessage,
            botReply,
            sessionId: sessionKey,
            nodeId: null,
            persistUserKey: `tg:${phone}`,
          });

          return res.json({ ok: true });
        }

        // Name step
        if (isNameStep(updatedSession.stage)) {
          const name = userMessage.trim();
          sessionStore.setName(sessionKey, name);

          const botGreet = `👋 Hi, ${name} you are connected to TurboTech Support. How can we help you?`;
          await sendTelegramMessage(chatId, botGreet);

          const resp = handleSupportCallback("main");
          await sendTelegramMessage(chatId, resp.text);

          await logConversation({
            channel: "telegram",
            adminChatId: deps.adminChatId,
            name,
            phone: updatedSession.phone,
            userMessage,
            botReply: resp.text,
            sessionId: sessionKey,
            nodeId: "main",
            persistUserKey: updatedSession.phone ? `tg:${updatedSession.phone}` : undefined,
          });

          return res.json({ ok: true });
        }

        // Ready menu
        if (isReadyMenuStep(updatedSession.stage)) {
          const nodeId = getNodeFromWebsiteMessage(userMessage);
          const resp = handleSupportCallback(nodeId);
          await sendTelegramMessage(chatId, resp.text);

          await logConversation({
            channel: "telegram",
            adminChatId: deps.adminChatId,
            name: updatedSession.name,
            phone: updatedSession.phone,
            userMessage,
            botReply: resp.text,
            sessionId: sessionKey,
            nodeId,
            persistUserKey: updatedSession.phone ? `tg:${updatedSession.phone}` : undefined,
          });

          return res.json({ ok: true });
        }

        // Contact support steps
        if (isContactStep(updatedSession.stage)) {
          const result = await handleContactStep({
            sessionKey,
            stage: updatedSession.stage,
            userMessage,
            session: updatedSession,
          });

          await sendTelegramMessage(chatId, result.text);

          // reset after completion handled inside server logic
          await logConversation({
            channel: "telegram",
            adminChatId: deps.adminChatId,
            name: updatedSession.name,
            phone: updatedSession.phone,
            userMessage,
            botReply: result.text,
            sessionId: sessionKey,
            nodeId: null,
            persistUserKey: updatedSession.phone ? `tg:${updatedSession.phone}` : undefined,
          });

          if (result.text.startsWith("✅")) sessionStore.reset(sessionKey);

          return res.json({ ok: true });
        }

        // Default restart
        sessionStore.reset(sessionKey);
        sessionStore.startOnboarding(sessionKey);
        const botReply = "📱 Please enter your phone number to continue.";
        await sendTelegramMessage(chatId, botReply);

        await logConversation({
          channel: "telegram",
          adminChatId: deps.adminChatId,
          name: undefined,
          phone: undefined,
          userMessage,
          botReply,
          sessionId: sessionKey,
          nodeId: null,
        });

        return res.json({ ok: true });
      }

      return res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "telegram webhook error" });
    }
  });
}
