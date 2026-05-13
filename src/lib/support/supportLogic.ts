export type SupportNodeId =
  | 'main'
  | 'booked_services'
  | 'free_gift_support'
  | 'payments_refunds'
  | 'technical_support'
  | 'account'
  | 'contact_support'
  | 'booking_check_status'
  | 'booking_not_completed'
  | 'booking_cancel'
  | 'booking_details'
  | 'gift_not_received'
  | 'gift_marked_delivered_not_received'
  | 'gift_cancel'
  | 'gift_info'
  | 'refund_status'
  | 'payment_failed'
  | 'amount_deducted'
  | 'laptop_issue'
  | 'virus_security'
  | 'website_issue'
  | 'other_issue'
  | 'login_issue'
  | 'update_phone'
  | 'update_email'
  | 'collect_contact_name'
  | 'collect_contact_phone'
  | 'collect_contact_issue'
  | 'unknown';

export type SupportMenuAction =
  | { type: 'NAVIGATE'; node: SupportNodeId }
  | { type: 'COLLECT_CONTACT'; stage: 'name' | 'phone' | 'issue' };

export interface SupportResponse {
  text: string;
  buttons: { label: string; callbackData: SupportNodeId }[];
  /**
   * If the bot is waiting for free-text from the user, set nextExpected to guide the backend state machine.
   * For web chat, we keep a simple per-user chat state.
   */
  nextExpected?: 'contact_name' | 'contact_phone' | 'contact_issue';
}

const MAIN_TEXT = '👋 Welcome to TurboTech Nova Assistant!\nHow can we help you today?';

export const supportButtons = {
  main: (): SupportResponse => ({
    text: MAIN_TEXT,
    buttons: [
      { label: '🛠 Booked Services', callbackData: 'booked_services' as const },
      { label: '🎁 Free Gift Support', callbackData: 'free_gift_support' as const },
      { label: '💳 Payments & Refunds', callbackData: 'payments_refunds' as const },
      { label: '⚙ Technical Support', callbackData: 'technical_support' as const },
      { label: '👤 Account', callbackData: 'account' as const },
      { label: '📞 Contact Support', callbackData: 'contact_support' as const },
    ] as { label: string; callbackData: SupportNodeId }[],
  }),

  backToMain: (): SupportResponse => ({
    text: MAIN_TEXT,
    buttons: [
      { label: '🛠 Booked Services', callbackData: 'booked_services' as const },
      { label: '🎁 Free Gift Support', callbackData: 'free_gift_support' as const },
      { label: '💳 Payments & Refunds', callbackData: 'payments_refunds' as const },
      { label: '⚙ Technical Support', callbackData: 'technical_support' as const },
      { label: '👤 Account', callbackData: 'account' as const },
      { label: '📞 Contact Support', callbackData: 'contact_support' as const },
    ] as { label: string; callbackData: SupportNodeId }[],
  }),

  bookedServices: (): SupportResponse => ({
    text: '🛠 Booked Services — choose an option:',
    buttons: [
      { label: '📅 Check Booking Status', callbackData: 'booking_check_status' as const },
      { label: '⏳ Service Not Completed', callbackData: 'booking_not_completed' as const },
      { label: '❌ Cancel Booking', callbackData: 'booking_cancel' as const },
      { label: '🧾 Service Details', callbackData: 'booking_details' as const },
      { label: '⬅ Back', callbackData: 'main' as const },
    ] as { label: string; callbackData: SupportNodeId }[],
  }),

  freeGiftSupport: (): SupportResponse => ({
    text: '🎁 Free Gift Support — choose an option:',
    buttons: [
      { label: '🚚 Gift Not Received', callbackData: 'gift_not_received' as const },
      { label: '📦 Marked Delivered but Not Received', callbackData: 'gift_marked_delivered_not_received' as const },
      { label: '❌ Cancel Gift', callbackData: 'gift_cancel' as const },
      { label: 'ℹ Gift Information', callbackData: 'gift_info' as const },
      { label: '⬅ Back', callbackData: 'main' as const },
    ] as { label: string; callbackData: SupportNodeId }[],
  }),

  paymentsRefunds: (): SupportResponse => ({
    text: '💳 Payments & Refunds — choose an option:',
    buttons: [
      { label: '💸 Refund Status', callbackData: 'refund_status' as const },
      { label: '❌ Payment Failed', callbackData: 'payment_failed' as const },
      { label: '💰 Amount Deducted', callbackData: 'amount_deducted' as const },
      { label: '⬅ Back', callbackData: 'main' as const },
    ] as { label: string; callbackData: SupportNodeId }[],
  }),

  technicalSupport: (): SupportResponse => ({
    text: '⚙ Technical Support — choose an option:',
    buttons: [
      { label: '💻 Laptop Issue', callbackData: 'laptop_issue' as const },
      { label: '🦠 Virus / Security', callbackData: 'virus_security' as const },
      { label: '🌐 Website Issue', callbackData: 'website_issue' as const },
      { label: '⚙ Other Issue', callbackData: 'other_issue' as const },
      { label: '⬅ Back', callbackData: 'main' as const },
    ] as { label: string; callbackData: SupportNodeId }[],
  }),

  account: (): SupportResponse => ({
    text: '👤 Account — choose an option:',
    buttons: [
      { label: '🔑 Login Issue', callbackData: 'login_issue' as const },
      { label: '📱 Update Phone', callbackData: 'update_phone' as const },
      { label: '📧 Update Email', callbackData: 'update_email' as const },
      { label: '⬅ Back', callbackData: 'main' as const },
    ] as { label: string; callbackData: SupportNodeId }[],
  }),

  contactSupport: (): SupportResponse => ({
    text: '📞 Contact Support — please enter your details.',
    buttons: [{ label: '⬅ Back', callbackData: 'main' as const }] as { label: string; callbackData: SupportNodeId }[],
  }),
};

const NO_REPLACEMENT_MESSAGE =
  'ℹ️ Note: For Free Gifts, return or replacement is not available. If you have an issue, we can help you check delivery status or proceed with cancellation.';
const contactNextButton = (): SupportResponse['buttons'] => [
  { label: '⬅ Back', callbackData: 'main' as SupportNodeId },
];

/**
 * Bot state machine is intentionally minimal:
 * - callbackData always maps to a menu node
 * - if nextExpected is set, the backend should capture the next user message as free text
 */
export function handleSupportCallback(callbackData: SupportNodeId): SupportResponse {
  switch (callbackData) {
    case 'main':
      return supportButtons.main();
    case 'booked_services':
      return supportButtons.bookedServices();
    case 'free_gift_support':
      return supportButtons.freeGiftSupport();
    case 'payments_refunds':
      return supportButtons.paymentsRefunds();
    case 'technical_support':
      return supportButtons.technicalSupport();
    case 'account':
      return supportButtons.account();
    case 'contact_support':
      return supportButtons.contactSupport();
    case 'booking_check_status':
      return { text: '📅 To check booking status, please share your booking ID (or the phone used to book).', buttons: contactNextButton() };
    case 'booking_not_completed':
      return { text: '⏳ Sorry for the delay. Please share your booking ID and what you’re waiting for.', buttons: contactNextButton() };
    case 'booking_cancel':
      return { text: '❌ To cancel a booking, share your booking ID. We’ll review and confirm.', buttons: contactNextButton() };
    case 'booking_details':
      return { text: '🧾 Share your booking ID to get the service details.', buttons: contactNextButton() };

    case 'gift_not_received':
      return { text: `${NO_REPLACEMENT_MESSAGE}\n\n🚚 Please share your order/booking ID (if available) or the phone used for the gift.`, buttons: contactNextButton() };
    case 'gift_marked_delivered_not_received':
      return { text: `${NO_REPLACEMENT_MESSAGE}\n\n📦 If it’s marked delivered but you didn’t receive it, share your order/booking ID or phone used.`, buttons: contactNextButton() };
    case 'gift_cancel':
      return { text: `${NO_REPLACEMENT_MESSAGE}\n\n❌ If you want to cancel the gift, please share your order/booking ID or phone used.`, buttons: contactNextButton() };
    case 'gift_info':
      return { text: `${NO_REPLACEMENT_MESSAGE}\n\nℹ️ For gift info, share your order/booking ID or phone used to locate it.`, buttons: contactNextButton() };

    case 'refund_status':
      return { text: '💸 Share your payment reference / transaction ID to check refund status.', buttons: contactNextButton() };
    case 'payment_failed':
      return { text: '❌ Payment failed — share the transaction reference and date/time (approx).', buttons: contactNextButton() };
    case 'amount_deducted':
      return { text: '💰 If the amount was deducted but payment failed, share transaction reference + screenshot (optional).', buttons: contactNextButton() };

    case 'laptop_issue':
      return { text: '💻 Tell us what exactly is happening with your laptop (model + issue).', buttons: contactNextButton() };
    case 'virus_security':
      return { text: '🦠 For virus/security issues, tell us symptoms (popups, slow PC, alerts) and any recent downloads.', buttons: contactNextButton() };
    case 'website_issue':
      return { text: '🌐 For website issues, tell us the site URL and what’s not working.', buttons: contactNextButton() };
    case 'other_issue':
      return { text: '⚙ Describe your issue in a sentence and we’ll route it.', buttons: contactNextButton() };

    case 'login_issue':
      return { text: '🔑 Login issue — tell us what error you see (and whether it’s phone or email login).', buttons: contactNextButton() };
    case 'update_phone':
      return { text: '📱 Update phone — tell us your current phone and the new phone you want to update.', buttons: contactNextButton() };
    case 'update_email':
      return { text: '📧 Update email — tell us your current email and the new email you want to update.', buttons: contactNextButton() };

    // Input collection nodes (handled by backend state, not by direct callback)
    case 'collect_contact_name':
    case 'collect_contact_phone':
    case 'collect_contact_issue':
    case 'unknown':
    default:
      return supportButtons.backToMain();
  }
}
