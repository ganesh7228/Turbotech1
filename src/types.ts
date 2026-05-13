export type UserRole = 'customer' | 'admin' | 'technician';

export interface User {
  id: string;
  phone: string;
  name?: string;
  role: UserRole;
  points?: number; // Turbo Points
  lifetimePoints?: number;
  badge?: 'Silver' | 'Gold' | 'Platinum';
  createdAt: string;
  isBlocked?: boolean;
}

export type BookingStatus = 
  | 'pending' 
  | 'pending_callback' 
  | 'approved' 
  | 'on_the_way' 
  | 'dispatched'
  | 'arriving' 
  | 'arrived' 
  | 'process_started' 
  | 'repair_started' 
  | 'repair_completed' 
  | 'payment_received' 
  | 'completed' 
  | 'rejected' 
  | 'cancelled';

export type GiftStatus = 
  | 'pending'
  | 'pin_verified'
  | 'admin_approved'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered';

export type BookingType = 'normal' | 'quick';

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  problem: string;
  date?: string;
  timeSlot?: string;
  type: BookingType;
  status: BookingStatus;
  technicianId?: string;
  technicianData?: {
    name: string;
    phone: string;
    photo?: string;
  };
  techLocation?: {
    lat: number;
    lng: number;
  };
  techLocationShareEnabled?: boolean;
  location?: {
    lat: number;
    lng: number;
  };
  statusHistory?: {
    status: BookingStatus;
    timestamp: string; // IST
  }[];
  eta?: string;
  distance?: number;
  total?: number;
  serviceCharge?: number;
  partsCost?: number;
  serviceOTP?: string;
  serviceOTPVerified?: boolean;
  deliveryOTP?: string;
  deliveryOTPVerified?: boolean;
  productPhoto?: string;
  gift?: {
    title: string;
    description: string;
    status: GiftStatus;
    pin?: string;
    updatedAt: string; // IST
  };
  rating?: {
    technician: number;
    app: {
      easeOfUse: number;
      professionalism: number;
      suggestions: string;
    };
  };
  createdAt: string; // IST
  updatedAt: string; // IST
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  type: 'first_order' | 'threshold' | 'custom';
  threshold?: number;
  autoApply: boolean;
  enabled: boolean;
  createdAt: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  imageUrl?: string;
  createdAt: string;
}

export interface RewardClaim {
  id: string;
  customerId: string;
  rewardId: string;
  status: GiftStatus;
  pin?: string;
  createdAt: string;
  updatedAt: string;
}
