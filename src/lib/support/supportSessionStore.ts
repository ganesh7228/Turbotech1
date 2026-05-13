import type { SupportNodeId } from "./supportLogic";

export type ContactStage =
  | "idle"
  | "contact_name_expected"
  | "contact_phone_expected"
  | "contact_issue_expected";

export type OnboardingStage = "awaiting_phone" | "awaiting_name" | "ready_menu";

export type Contact = { name?: string; phone?: string; issue?: string };

export type SupportSession =
  | {
      stage: "idle";
      phone?: string;
      name?: string;
    }
  | {
      stage: "awaiting_phone";
      phone?: string;
      name?: string;
    }
  | {
      stage: "awaiting_name";
      phone: string;
      name?: string;
    }
  | {
      stage: "ready_menu";
      phone: string;
      name?: string;
    }
  // Contact Support is a separate multi-step flow, after onboarding
  | { stage: "contact_name_expected"; phone?: string; name?: string; contact: Contact }
  | { stage: "contact_phone_expected"; phone?: string; name?: string; contact: Contact }
  | { stage: "contact_issue_expected"; phone?: string; name?: string; contact: Contact };

function createEmptyContact(): Contact {
  return { name: undefined, phone: undefined, issue: undefined };
}

export class SupportSessionStore {
  private sessions = new Map<string, SupportSession>();

  get(sessionKey: string): SupportSession {
    return this.sessions.get(sessionKey) ?? { stage: "idle" };
  }

  set(sessionKey: string, session: SupportSession) {
    this.sessions.set(sessionKey, session);
  }

  /** Start onboarding by asking for phone */
  startOnboarding(sessionKey: string) {
    const existing = this.get(sessionKey);
    this.sessions.set(sessionKey, {
      stage: "awaiting_phone",
      phone: existing.stage === "awaiting_name" || existing.stage === "ready_menu" ? existing.phone : undefined,
      name: existing.stage === "awaiting_name" || existing.stage === "ready_menu" ? existing.name : undefined,
    });
  }

  /** After phone */
  setPhoneAndMaybeName(sessionKey: string, phone: string, name?: string) {
    const cleanedName = name?.trim() || "";
    if (cleanedName) {
      this.sessions.set(sessionKey, { stage: "ready_menu", phone, name: cleanedName });
      return;
    }
    this.sessions.set(sessionKey, { stage: "awaiting_name", phone });
  }

  setName(sessionKey: string, name: string) {
    const session = this.get(sessionKey);
    const cleaned = name.trim();

    if (session.stage !== "awaiting_name") {
      // Recover gracefully into ready_menu
      this.sessions.set(sessionKey, {
        stage: "ready_menu",
        phone: (session as any).phone ?? "",
        name: cleaned,
      });
      return;
    }

    this.sessions.set(sessionKey, { stage: "ready_menu", phone: session.phone, name: cleaned });
  }

  isReady(session: SupportSession) {
    return session.stage === "ready_menu";
  }

  reset(sessionKey: string) {
    this.sessions.set(sessionKey, { stage: "idle" });
  }

  /** Start contact support multi-step */
  startContact(sessionKey: string) {
    const session = this.get(sessionKey);
    const phone = session.stage === "idle" ? "" : (session as any).phone ?? "";
    const name = session.stage === "idle" ? "" : (session as any).name ?? undefined;

    this.sessions.set(sessionKey, {
      stage: "contact_name_expected",
      phone,
      name,
      contact: createEmptyContact(),
    });
  }

  resetContactSupport(sessionKey: string) {
    const session = this.get(sessionKey);

    if (session.stage === "contact_name_expected" || session.stage === "contact_phone_expected" || session.stage === "contact_issue_expected") {
      this.sessions.set(sessionKey, {
        stage: "ready_menu",
        phone: session.phone ?? "",
        name: session.name,
      });
      return;
    }

    this.reset(sessionKey);
  }

  /**
   * Records the next free-text input for Contact Support.
   * Returns the partial/full contact and whether collection is complete.
   */
  recordContactInput(
    sessionKey: string,
    input: string
  ): { contact: Contact; done: boolean } {
    const session = this.get(sessionKey);
    const cleaned = input.trim();

    if (
      session.stage !== "contact_name_expected" &&
      session.stage !== "contact_phone_expected" &&
      session.stage !== "contact_issue_expected"
    ) {
      return { contact: createEmptyContact(), done: false };
    }

    if (session.stage === "contact_name_expected") {
      const nextContact = { ...session.contact, name: cleaned };
      this.sessions.set(sessionKey, {
        stage: "contact_phone_expected",
        phone: session.phone,
        name: session.name,
        contact: nextContact,
      });
      return { contact: nextContact, done: false };
    }

    if (session.stage === "contact_phone_expected") {
      const nextContact = { ...session.contact, phone: cleaned };
      this.sessions.set(sessionKey, {
        stage: "contact_issue_expected",
        phone: session.phone,
        name: session.name,
        contact: nextContact,
      });
      return { contact: nextContact, done: false };
    }

    // contact_issue_expected
    const nextContact = { ...session.contact, issue: cleaned };
    this.sessions.set(sessionKey, {
      stage: "ready_menu",
      phone: session.phone ?? "",
      name: session.name,
    });
    return { contact: nextContact, done: true };
  }
}
